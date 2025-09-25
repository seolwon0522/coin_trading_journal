"""
Nautilus Trading Node Manager
Nautilus Trader의 네이티브 기능을 최대한 활용하는 싱글톤 매니저
"""

import os
import asyncio
from typing import Optional, Dict, Any, List
from pathlib import Path
from decimal import Decimal
import logging

from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.config import BinanceDataClientConfig, BinanceExecClientConfig
from nautilus_trader.adapters.binance.factories import BinanceLiveDataClientFactory, BinanceLiveExecClientFactory
from nautilus_trader.config import (
    CacheDatabaseConfig,
    LiveExecEngineConfig,
    LiveDataEngineConfig,
    LiveRiskEngineConfig,
    LoggingConfig,
    MessageBusConfig,
    TradingNodeConfig,
)
from nautilus_trader.live.node import TradingNode
from nautilus_trader.model.identifiers import TraderId, StrategyId, Venue
from nautilus_trader.model.currencies import USD
from nautilus_trader.trading.strategy import Strategy

from app.config.settings import settings

logger = logging.getLogger(__name__)


class NautilusManager:
    """
    Nautilus TradingNode를 관리하는 싱글톤 클래스
    - Nautilus의 네이티브 기능을 최대한 활용
    - 상태 관리는 Nautilus에 위임
    - API gateway 역할만 수행
    """

    _instance: Optional['NautilusManager'] = None
    _node: Optional[TradingNode] = None
    _is_initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """초기화는 한번만 수행"""
        if not self._is_initialized:
            self._node = None
            self._config = None
            self._trader_id = TraderId("TRADER-001")
            self._venue = Venue("BINANCE")
            self._strategies_registry = {}  # strategy_id -> strategy_class mapping
            self._is_initialized = True

    def build_config(self) -> TradingNodeConfig:
        """
        Nautilus TradingNode 설정 생성
        모든 설정을 Nautilus 네이티브로 구성
        """
        catalog_path = Path("catalog")
        catalog_path.mkdir(exist_ok=True)

        return TradingNodeConfig(
            trader_id=self._trader_id,
            logging=LoggingConfig(
                log_level="INFO",
                log_to_console=True,
                log_file_path="logs/nautilus.log",
            ),
            cache=CacheDatabaseConfig(
                type="in-memory",
                flush_on_start=False,
            ),
            message_bus=MessageBusConfig(
                database=CacheDatabaseConfig(type="in-memory"),
                encoding="msgpack",
                timestamps_as_utc=True,
                buffer_interval_ms=100,
                autotrim_mins=30,
            ),
            data_engine=LiveDataEngineConfig(
                qsize=10000,
            ),
            exec_engine=LiveExecEngineConfig(
                qsize=10000,
            ),
            risk_engine=LiveRiskEngineConfig(
                bypass=False,  # Risk checks enabled
                max_order_submit_rate=100,
                max_order_modify_rate=50,
                max_notional_per_order={
                    "BINANCE": Decimal("50000.0")
                },
            ),
            timeout_connection=20.0,
            timeout_reconciliation=10.0,
            timeout_portfolio=10.0,
            timeout_disconnection=10.0,
            timeout_post_stop=5.0,
        )

    async def initialize(self) -> None:
        """
        TradingNode 초기화
        """
        if self._node is not None:
            logger.warning("TradingNode already initialized")
            return

        # Config 생성
        config = self.build_config()

        # TradingNode 생성
        self._node = TradingNode(config=config)

        # Binance 클라이언트 설정
        await self._setup_binance_clients()

        # Node build
        self._node.build()

        logger.info("NautilusManager initialized with TradingNode")

    async def _setup_binance_clients(self) -> None:
        """
        Binance 데이터 및 실행 클라이언트 설정
        """
        if not self._node:
            raise RuntimeError("TradingNode not initialized")

        # API 키 확인
        api_key = os.getenv("BINANCE_TESTNET_API_KEY" if settings.is_testnet else "BINANCE_API_KEY")
        api_secret = os.getenv("BINANCE_TESTNET_API_SECRET" if settings.is_testnet else "BINANCE_API_SECRET")

        if not api_key or not api_secret:
            logger.warning("Binance API credentials not found, running in read-only mode")
            api_key = api_key or ""
            api_secret = api_secret or ""

        # URL 설정
        base_url_http = "https://testnet.binance.vision" if settings.is_testnet else "https://api.binance.com"
        base_url_ws = "wss://testnet.binance.vision" if settings.is_testnet else "wss://stream.binance.com:9443"

        # Data Client Config
        data_config = BinanceDataClientConfig(
            api_key=api_key,
            api_secret=api_secret,
            account_type=BinanceAccountType.SPOT,
            base_url_http=base_url_http,
            base_url_ws=base_url_ws,
            us=False,
        )

        # Execution Client Config
        exec_config = BinanceExecClientConfig(
            api_key=api_key,
            api_secret=api_secret,
            account_type=BinanceAccountType.SPOT,
            base_url_http=base_url_http,
            base_url_ws=base_url_ws,
            us=False,
        )

        # Add factories
        self._node.add_data_client_factory("BINANCE", BinanceLiveDataClientFactory, data_config)
        self._node.add_exec_client_factory("BINANCE", BinanceLiveExecClientFactory, exec_config)

        logger.info(f"Binance clients configured (testnet={settings.is_testnet})")

    async def start(self) -> None:
        """
        TradingNode 시작
        """
        if not self._node:
            await self.initialize()

        if self._node.is_running:
            logger.warning("TradingNode already running")
            return

        await self._node.start()
        logger.info("TradingNode started")

    async def stop(self) -> None:
        """
        TradingNode 정지
        """
        if not self._node:
            logger.warning("TradingNode not initialized")
            return

        if not self._node.is_running:
            logger.warning("TradingNode not running")
            return

        await self._node.stop()
        await self._node.dispose()
        logger.info("TradingNode stopped")

    def add_strategy(self, strategy: Strategy) -> None:
        """
        전략 추가 - Nautilus 네이티브 Strategy 객체를 직접 추가
        """
        if not self._node:
            raise RuntimeError("TradingNode not initialized")

        if not self._node.is_running:
            raise RuntimeError("TradingNode not running")

        # Nautilus Trader에 전략 추가
        self._node.trader.add_strategy(strategy)

        # Registry에 저장
        self._strategies_registry[strategy.id.value] = strategy

        logger.info(f"Strategy {strategy.id} added to TradingNode")

    def get_strategy(self, strategy_id: str) -> Optional[Strategy]:
        """
        전략 가져오기
        """
        return self._strategies_registry.get(strategy_id)

    def list_strategies(self) -> List[Dict[str, Any]]:
        """
        모든 전략 목록 반환
        """
        strategies = []

        for strategy_id, strategy in self._strategies_registry.items():
            strategies.append({
                "id": strategy_id,
                "name": strategy.__class__.__name__,
                "is_running": strategy.is_running,
                "is_initialized": strategy.is_initialized,
            })

        return strategies

    def remove_strategy(self, strategy_id: str) -> bool:
        """
        전략 제거
        """
        if strategy_id not in self._strategies_registry:
            return False

        strategy = self._strategies_registry[strategy_id]

        # Nautilus에서 전략 제거
        if self._node and self._node.trader:
            self._node.trader.remove_strategy(strategy)

        # Registry에서 제거
        del self._strategies_registry[strategy_id]

        logger.info(f"Strategy {strategy_id} removed")
        return True

    @property
    def is_running(self) -> bool:
        """노드 실행 상태"""
        return self._node.is_running if self._node else False

    @property
    def node(self) -> Optional[TradingNode]:
        """TradingNode 직접 접근"""
        return self._node

    @property
    def cache(self):
        """Nautilus Cache 접근"""
        return self._node.cache if self._node else None

    @property
    def portfolio(self):
        """Nautilus Portfolio 접근"""
        return self._node.portfolio if self._node else None

    @property
    def msgbus(self):
        """Nautilus MessageBus 접근"""
        return self._node.msgbus if self._node else None

    @property
    def risk_engine(self):
        """Nautilus RiskEngine 접근"""
        return self._node.risk_engine if self._node else None

    def get_positions(self) -> List[Dict[str, Any]]:
        """
        현재 포지션 목록 - Nautilus Portfolio에서 직접 가져옴
        """
        if not self.portfolio:
            return []

        positions = []
        for position in self.portfolio.positions_open():
            positions.append({
                "id": str(position.id),
                "symbol": str(position.instrument_id),
                "side": "LONG" if position.is_long else "SHORT",
                "quantity": float(position.quantity),
                "entry_price": float(position.avg_px_open),
                "unrealized_pnl": float(position.unrealized_pnl(position.last_px)),
                "realized_pnl": float(position.realized_pnl),
            })

        return positions

    def get_orders(self) -> List[Dict[str, Any]]:
        """
        현재 주문 목록 - Nautilus Cache에서 직접 가져옴
        """
        if not self.cache:
            return []

        orders = []
        for order in self.cache.orders():
            if order.is_open:
                orders.append({
                    "id": str(order.client_order_id),
                    "symbol": str(order.instrument_id),
                    "side": str(order.side),
                    "type": str(order.order_type),
                    "quantity": float(order.quantity),
                    "price": float(order.price) if order.price else None,
                    "status": str(order.status),
                })

        return orders

    def get_account_balance(self) -> Dict[str, Any]:
        """
        계좌 잔고 - Nautilus Account에서 직접 가져옴
        """
        if not self.portfolio:
            return {"total": 0.0, "free": 0.0, "used": 0.0}

        account = self.portfolio.account(self._venue)
        if not account:
            return {"total": 0.0, "free": 0.0, "used": 0.0}

        balance = account.balance(USD)
        if not balance:
            return {"total": 0.0, "free": 0.0, "used": 0.0}

        return {
            "total": float(balance.total),
            "free": float(balance.free),
            "used": float(balance.total - balance.free),
        }

    def get_performance_stats(self) -> Dict[str, Any]:
        """
        성과 통계 - Nautilus Portfolio에서 직접 계산
        """
        if not self.portfolio:
            return {}

        analyzer = self.portfolio.analyzer

        return {
            "total_pnl": float(analyzer.total_pnl(USD)) if analyzer else 0.0,
            "total_returns": float(analyzer.total_returns(USD)) if analyzer else 0.0,
            "win_rate": float(analyzer.win_rate) if analyzer else 0.0,
            "profit_factor": float(analyzer.profit_factor) if analyzer else 0.0,
            "sharpe_ratio": float(analyzer.sharpe_ratio) if analyzer else 0.0,
            "max_drawdown": float(analyzer.max_drawdown) if analyzer else 0.0,
        }


# 싱글톤 인스턴스
_manager = NautilusManager()


def get_nautilus_manager() -> NautilusManager:
    """
    NautilusManager 싱글톤 인스턴스 반환
    """
    return _manager