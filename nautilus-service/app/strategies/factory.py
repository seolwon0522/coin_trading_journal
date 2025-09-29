"""
Strategy Factory for Nautilus Trading Service
Aligned with Nautilus Trader best practices.
"""

from typing import Dict, Any, Type, Tuple, Optional
from decimal import Decimal

from nautilus_trader.config import StrategyConfig
from nautilus_trader.trading.strategy import Strategy

# Import strategies
from app.strategies.ema_cross import EMACrossStrategy, EMACrossConfig
from app.strategies.grid_trading import GridTradingStrategy, GridTradingConfig
from app.strategies.rsi_strategy import RSIStrategy, RSIConfig
from app.strategies.bollinger_bands import BollingerBandsStrategy, BollingerBandsConfig
from app.strategies.momentum import MomentumStrategy, MomentumConfig
from app.strategies.orderbook_imbalance import (
    OrderbookImbalanceStrategy,
    OrderbookImbalanceConfig,
)


class StrategyFactory:
    """Creates strategy instances from canonical configs."""

    # strategy_type -> (Config, Strategy)
    STRATEGY_REGISTRY: Dict[str, Tuple[Type[StrategyConfig], Type[Strategy]]] = {
        "ema_cross": (EMACrossConfig, EMACrossStrategy),
        "grid": (GridTradingConfig, GridTradingStrategy),
        "rsi": (RSIConfig, RSIStrategy),
        "bollinger_bands": (BollingerBandsConfig, BollingerBandsStrategy),
        "momentum": (MomentumConfig, MomentumStrategy),
        "orderbook_imbalance": (
            OrderbookImbalanceConfig,
            OrderbookImbalanceStrategy,
        ),
    }

    # timeframe -> Nautilus interval
    TIMEFRAME_MAP = {
        "1m": "1-MINUTE",
        "5m": "5-MINUTE",
        "15m": "15-MINUTE",
        "30m": "30-MINUTE",
        "1h": "1-HOUR",
        "4h": "4-HOUR",
        "1d": "1-DAY",
    }

    @classmethod
    def create(
        cls,
        strategy_type: str,
        instrument_id: str,
        timeframe: str,
        parameters: Dict[str, Any],
        strategy_id: Optional[str] = None,
    ) -> Strategy:
        """Instantiate a Nautilus Trader strategy for the requested type."""
        if strategy_type not in cls.STRATEGY_REGISTRY:
            raise ValueError(f"Unknown strategy type: {strategy_type}")

        config_class, strategy_class = cls.STRATEGY_REGISTRY[strategy_type]

        # Base config payload shared across strategies
        config_params: Dict[str, Any] = {
            "instrument_id": instrument_id,
            "bar_type": cls._create_bar_type_string(instrument_id, timeframe),
        }

        if strategy_id:
            config_params["strategy_id"] = strategy_id

        config_params.update(cls._prepare_parameters(strategy_type, parameters))

        config = config_class(**config_params)
        strategy = strategy_class(config)
        return strategy

    @classmethod
    def _create_bar_type_string(cls, instrument_id: str, timeframe: str) -> str:
        interval = cls.TIMEFRAME_MAP.get(timeframe, "1-MINUTE")
        return f"{instrument_id}-{interval}-LAST-EXTERNAL"

    @classmethod
    def _prepare_parameters(cls, strategy_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        prepared: Dict[str, Any] = {}

        # common parameters
        if "trade_size" in params:
            prepared["trade_size"] = Decimal(str(params["trade_size"]))
        if "max_positions" in params:
            prepared["max_positions"] = int(params["max_positions"])
        if "stop_loss_pct" in params:
            prepared["stop_loss_pct"] = float(params["stop_loss_pct"])
        if "take_profit_pct" in params:
            prepared["take_profit_pct"] = float(params["take_profit_pct"])

        # strategy specific parameters
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

        for key, value in params.items():
            if key not in prepared:
                prepared[key] = value

        return prepared

    @classmethod
    def get_default_parameters(cls, strategy_type: str) -> Dict[str, Any]:
        defaults = {
            "ema_cross": {
                "fast_period": 10,
                "slow_period": 20,
                "trade_size": "0.01",
            },
            "grid": {
                "grid_levels": 10,
                "grid_spacing": 0.01,
                "position_size": "0.01",
            },
            "rsi": {
                "rsi_period": 14,
                "rsi_overbought": 70,
                "rsi_oversold": 30,
            },
            "bollinger_bands": {
                "bb_period": 20,
                "bb_std": 2.0,
            },
            "momentum": {
                "lookback_period": 20,
                "momentum_threshold": 0.02,
            },
            "orderbook_imbalance": {
                "imbalance_threshold": 0.3,
                "order_levels": 5,
                "spread_multiplier": 1.5,
            },
        }
        if strategy_type not in defaults:
            raise ValueError(f"Unknown strategy type: {strategy_type}")
        return defaults[strategy_type]
