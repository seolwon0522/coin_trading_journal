"""
Strategy Factory for Nautilus Trading Service
전략 생성을 위한 팩토리 패턴 - NautilusTrader 내장 전략 활용
"""

from typing import Dict, Any, Type, Tuple
from decimal import Decimal

from nautilus_trader.config import StrategyConfig
from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.model.data import BarType
from nautilus_trader.model.identifiers import InstrumentId

# Import strategies
from app.strategies.ema_cross import EMACrossStrategy, EMACrossConfig
from app.strategies.grid_trading import GridTradingStrategy, GridTradingConfig
from app.strategies.rsi_strategy import RSIStrategy, RSIConfig
from app.strategies.bollinger_bands import BollingerBandsStrategy, BollingerBandsConfig
from app.strategies.momentum import MomentumStrategy, MomentumConfig
from app.strategies.orderbook_imbalance import OrderbookImbalanceStrategy, OrderbookImbalanceConfig


class StrategyFactory:
    """
    전략 팩토리 - NautilusTrader 전략을 생성하는 심플한 팩토리
    """

    # 전략 레지스트리 - (Config클래스, Strategy클래스) 튜플
    STRATEGY_REGISTRY: Dict[str, Tuple[Type[StrategyConfig], Type[Strategy]]] = {
        "ema_cross": (EMACrossConfig, EMACrossStrategy),
        "grid": (GridTradingConfig, GridTradingStrategy),
        "rsi": (RSIConfig, RSIStrategy),
        "bollinger_bands": (BollingerBandsConfig, BollingerBandsStrategy),
        "momentum": (MomentumConfig, MomentumStrategy),
        "orderbook_imbalance": (OrderbookImbalanceConfig, OrderbookImbalanceStrategy),
    }

    # 타임프레임 매핑
    TIMEFRAME_MAP = {
        "1m": "1-MINUTE",
        "5m": "5-MINUTE",
        "15m": "15-MINUTE",
        "30m": "30-MINUTE",
        "1h": "1-HOUR",
        "4h": "4-HOUR",
        "1d": "1-DAY"
    }

    @classmethod
    def create(
        cls,
        strategy_type: str,
        instrument_id: str,
        timeframe: str,
        parameters: Dict[str, Any]
    ) -> Strategy:
        """
        전략 생성

        Args:
            strategy_type: 전략 타입 (ema_cross, grid, etc.)
            instrument_id: 거래 심볼 (BTCUSDT.BINANCE)
            timeframe: 타임프레임 (1m, 5m, etc.)
            parameters: 전략별 파라미터

        Returns:
            Strategy instance
        """
        if strategy_type not in cls.STRATEGY_REGISTRY:
            raise ValueError(f"Unknown strategy type: {strategy_type}")

        config_class, strategy_class = cls.STRATEGY_REGISTRY[strategy_type]

        # Bar type 생성
        bar_type_str = cls._create_bar_type_string(instrument_id, timeframe)

        # 기본 파라미터 설정
        config_params = {
            "instrument_id": instrument_id,
            "bar_type": bar_type_str
        }

        # 전략별 파라미터 추가
        config_params.update(cls._prepare_parameters(strategy_type, parameters))

        # Config 생성
        config = config_class(**config_params)

        # Strategy 생성
        strategy = strategy_class(config)

        return strategy

    @classmethod
    def _create_bar_type_string(cls, instrument_id: str, timeframe: str) -> str:
        """Bar type string 생성"""
        interval = cls.TIMEFRAME_MAP.get(timeframe, "1-MINUTE")
        return f"{instrument_id}-{interval}-LAST-EXTERNAL"

    @classmethod
    def _prepare_parameters(cls, strategy_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        전략별 파라미터 준비 및 검증
        """
        prepared = {}

        # 공통 파라미터 처리
        if "trade_size" in params:
            prepared["trade_size"] = Decimal(str(params["trade_size"]))
        if "max_positions" in params:
            prepared["max_positions"] = int(params["max_positions"])
        if "stop_loss_pct" in params:
            prepared["stop_loss_pct"] = float(params["stop_loss_pct"])
        if "take_profit_pct" in params:
            prepared["take_profit_pct"] = float(params["take_profit_pct"])

        # 전략별 특수 파라미터
        if strategy_type == "ema_cross":
            prepared["fast_period"] = params.get("fast_period", 10)
            prepared["slow_period"] = params.get("slow_period", 20)

        elif strategy_type == "grid":
            prepared["grid_levels"] = params.get("grid_levels", 10)
            prepared["grid_spacing"] = params.get("grid_spacing", 0.01)
            prepared["position_size"] = Decimal(str(params.get("position_size", "0.01")))

        elif strategy_type == "rsi":
            prepared["rsi_period"] = params.get("rsi_period", 14)
            prepared["rsi_overbought"] = params.get("rsi_overbought", 70)
            prepared["rsi_oversold"] = params.get("rsi_oversold", 30)

        elif strategy_type == "bollinger_bands":
            prepared["bb_period"] = params.get("bb_period", 20)
            prepared["bb_std"] = params.get("bb_std", 2.0)

        elif strategy_type == "momentum":
            prepared["lookback_period"] = params.get("lookback_period", 20)
            prepared["momentum_threshold"] = params.get("momentum_threshold", 0.02)

        elif strategy_type == "orderbook_imbalance":
            prepared["imbalance_threshold"] = params.get("imbalance_threshold", 0.3)
            prepared["order_levels"] = params.get("order_levels", 5)
            prepared["spread_multiplier"] = params.get("spread_multiplier", 1.5)

        # 기타 파라미터 그대로 전달
        for key, value in params.items():
            if key not in prepared:
                prepared[key] = value

        return prepared

    @classmethod
    def get_default_parameters(cls, strategy_type: str) -> Dict[str, Any]:
        """
        전략별 기본 파라미터 반환
        """
        defaults = {
            "ema_cross": {
                "fast_period": 10,
                "slow_period": 20,
                "trade_size": "0.01",
                "max_positions": 1,
                "stop_loss_pct": 0.02,
                "take_profit_pct": 0.03
            },
            "grid": {
                "grid_levels": 10,
                "grid_spacing": 0.01,
                "position_size": "0.01",
                "max_positions": 10
            },
            "rsi": {
                "rsi_period": 14,
                "rsi_overbought": 70,
                "rsi_oversold": 30,
                "trade_size": "0.01",
                "max_positions": 1
            },
            "bollinger_bands": {
                "bb_period": 20,
                "bb_std": 2.0,
                "trade_size": "0.01",
                "max_positions": 1
            },
            "momentum": {
                "lookback_period": 20,
                "momentum_threshold": 0.02,
                "trade_size": "0.01",
                "max_positions": 1
            },
            "orderbook_imbalance": {
                "imbalance_threshold": 0.3,
                "order_levels": 5,
                "spread_multiplier": 1.5,
                "position_size": "0.01",
                "max_positions": 5
            }
        }

        return defaults.get(strategy_type, {})

    @classmethod
    def list_available_strategies(cls) -> Dict[str, Dict[str, Any]]:
        """
        사용 가능한 전략 목록 및 정보 반환
        """
        strategies = {}

        for name in cls.STRATEGY_REGISTRY:
            strategies[name] = {
                "name": name,
                "description": cls._get_strategy_description(name),
                "default_parameters": cls.get_default_parameters(name),
                "suitable_market": cls._get_suitable_market(name)
            }

        return strategies

    @staticmethod
    def _get_strategy_description(strategy_type: str) -> str:
        """전략 설명"""
        descriptions = {
            "ema_cross": "EMA 크로스오버 - 추세 추종 전략",
            "grid": "그리드 트레이딩 - 레인지 마켓 전략",
            "rsi": "RSI 기반 과매수/과매도 전략",
            "bollinger_bands": "볼린저 밴드 평균회귀 전략",
            "momentum": "모멘텀 기반 추세 추종 전략",
            "orderbook_imbalance": "호가창 불균형 마켓 메이킹 전략"
        }
        return descriptions.get(strategy_type, "")

    @staticmethod
    def _get_suitable_market(strategy_type: str) -> str:
        """적합한 시장 조건"""
        markets = {
            "ema_cross": "트렌드 시장",
            "grid": "횡보/레인지 시장",
            "rsi": "변동성 시장",
            "bollinger_bands": "평균회귀 시장",
            "momentum": "강한 트렌드 시장",
            "orderbook_imbalance": "유동성 있는 시장"
        }
        return markets.get(strategy_type, "")