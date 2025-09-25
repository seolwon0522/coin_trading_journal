"""
Nautilus Trading Engine - Best Practice Implementation
완전히 재설계된 Nautilus Trader 통합 엔진
"""

from decimal import Decimal
from typing import Dict, Optional, List, Any
import asyncio
from datetime import datetime
import logging

from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.factories import BinanceLiveDataClientFactory
from nautilus_trader.adapters.binance.factories import BinanceLiveExecClientFactory
from nautilus_trader.cache.cache import Cache
from nautilus_trader.common.actor import Actor
from nautilus_trader.common.clock import LiveClock
from nautilus_trader.common.logging import Logger
from nautilus_trader.config import (
    CacheDatabaseConfig,
    DataEngineConfig,
    ExecEngineConfig,
    InstrumentProviderConfig,
    LiveDataClientConfig,
    LiveExecClientConfig,
    LiveRiskEngineConfig,
    LoggingConfig,
    MessageBusConfig,
    StreamingConfig,
    TradingNodeConfig,
)
from nautilus_trader.core.uuid import UUID4
from nautilus_trader.live.node import TradingNode
from nautilus_trader.model.identifiers import ClientId
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.identifiers import StrategyId
from nautilus_trader.model.identifiers import TraderId
from nautilus_trader.model.identifiers import Venue
from nautilus_trader.model.objects import Money
from nautilus_trader.model.objects import Price
from nautilus_trader.model.objects import Quantity
from nautilus_trader.msgbus.bus import MessageBus
from nautilus_trader.persistence.catalog.parquet import ParquetDataCatalog
from nautilus_trader.persistence.wranglers import BarDataWrangler
from nautilus_trader.portfolio.portfolio import Portfolio
from nautilus_trader.risk.engine import RiskEngine
from nautilus_trader.trading.strategy import Strategy

from app.config import settings

logger = logging.getLogger(__name__)


class NautilusEngine:
    """
    Nautilus Trader Engine - Single source of truth
    모든 거래 기능을 관리하는 통합 엔진
    """

    def __init__(self):
        self.node: Optional[TradingNode] = None
        self.strategies: Dict[str, Strategy] = {}
        self.is_running = False
        self._setup_complete = False

    async def initialize(self, config: Optional[Dict[str, Any]] = None):
        """
        Nautilus Trading Node 초기화
        """
        try:
            # 기본 설정
            trader_id = TraderId("TRADER-001")

            # 노드 설정
            node_config = TradingNodeConfig(
                trader_id=trader_id,

                # 로깅 설정
                logging=LoggingConfig(
                    log_level="INFO",
                    log_colors=True,
                ),

                # 데이터 엔진 설정
                data_engine=DataEngineConfig(
                    time_bars_timestamp_on_close=False,
                    validate_data_sequence=True,
                ),

                # 실행 엔진 설정
                exec_engine=ExecEngineConfig(
                    load_cache=True,
                ),

                # 리스크 엔진 설정
                risk_engine=LiveRiskEngineConfig(
                    bypass=False,  # 리스크 체크 활성화
                    max_order_submit_rate="100/00:00:01",  # 초당 100개 주문
                    max_order_modify_rate="100/00:00:01",
                    max_notional_per_order={"BINANCE": 10_000_000},  # 주문당 최대 금액
                ),

                # 캐시 설정
                cache=CacheDatabaseConfig(
                    type="redis",
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                ),

                # 메시지 버스 설정
                message_bus=MessageBusConfig(
                    database=CacheDatabaseConfig(
                        type="redis",
                        host=settings.REDIS_HOST,
                        port=settings.REDIS_PORT,
                    ),
                    streaming=StreamingConfig(
                        catalog_path=str(settings.DATA_PATH),
                        fs_protocol="file",
                        include_types=["OrderBookDelta"],
                    ),
                ),

                # Binance 데이터 클라이언트 설정
                data_clients={
                    "BINANCE": LiveDataClientConfig(
                        client_cls=BinanceLiveDataClientFactory.create,
                        config={
                            "api_key": settings.BINANCE_API_KEY or "",
                            "api_secret": settings.BINANCE_SECRET_KEY or "",
                            "account_type": BinanceAccountType.SPOT,
                            "base_url_http": settings.BINANCE_HTTP_BASE_URL,
                            "base_url_ws": settings.BINANCE_WS_BASE_URL,
                            "us": False,
                            "testnet": settings.USE_TESTNET,
                        },
                    ),
                },

                # Binance 실행 클라이언트 설정
                exec_clients={
                    "BINANCE": LiveExecClientConfig(
                        client_cls=BinanceLiveExecClientFactory.create,
                        config={
                            "api_key": settings.BINANCE_API_KEY or "",
                            "api_secret": settings.BINANCE_SECRET_KEY or "",
                            "account_type": BinanceAccountType.SPOT,
                            "base_url_http": settings.BINANCE_HTTP_BASE_URL,
                            "base_url_ws": settings.BINANCE_WS_BASE_URL,
                            "us": False,
                            "testnet": settings.USE_TESTNET,
                        },
                    ),
                },

                timeout_connection=30.0,
                timeout_reconciliation=10.0,
                timeout_portfolio=10.0,
                timeout_disconnection=10.0,
                timeout_post_stop=5.0,
            )

            # 노드 생성
            self.node = TradingNode(config=node_config)

            # 노드 빌드
            self.node.build()

            self._setup_complete = True
            logger.info("Nautilus Engine initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Nautilus Engine: {e}")
            raise

    async def start(self):
        """
        엔진 시작
        """
        if not self._setup_complete:
            await self.initialize()

        if self.node and not self.is_running:
            try:
                await self.node.start()
                self.is_running = True
                logger.info("Nautilus Engine started")
            except Exception as e:
                logger.error(f"Failed to start Nautilus Engine: {e}")
                raise

    async def stop(self):
        """
        엔진 중지
        """
        if self.node and self.is_running:
            try:
                await self.node.stop()
                self.is_running = False
                logger.info("Nautilus Engine stopped")
            except Exception as e:
                logger.error(f"Failed to stop Nautilus Engine: {e}")
                raise

    async def dispose(self):
        """
        엔진 리소스 정리
        """
        if self.node:
            try:
                if self.is_running:
                    await self.stop()
                await self.node.dispose()
                self.node = None
                self._setup_complete = False
                logger.info("Nautilus Engine disposed")
            except Exception as e:
                logger.error(f"Failed to dispose Nautilus Engine: {e}")
                raise

    def add_strategy(self, strategy: Strategy) -> str:
        """
        전략 추가
        """
        if not self.node:
            raise RuntimeError("Engine not initialized")

        strategy_id = str(strategy.id)

        # Trader에 전략 추가
        self.node.trader.add_strategy(strategy)
        self.strategies[strategy_id] = strategy

        logger.info(f"Strategy {strategy_id} added to engine")
        return strategy_id

    def remove_strategy(self, strategy_id: str) -> bool:
        """
        전략 제거
        """
        if not self.node:
            raise RuntimeError("Engine not initialized")

        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]
        self.node.trader.remove_strategy(strategy)
        del self.strategies[strategy_id]

        logger.info(f"Strategy {strategy_id} removed from engine")
        return True

    def start_strategy(self, strategy_id: str) -> bool:
        """
        전략 시작
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]
        self.node.trader.start_strategy(strategy)

        logger.info(f"Strategy {strategy_id} started")
        return True

    def stop_strategy(self, strategy_id: str) -> bool:
        """
        전략 중지
        """
        if strategy_id not in self.strategies:
            return False

        strategy = self.strategies[strategy_id]
        self.node.trader.stop_strategy(strategy)

        logger.info(f"Strategy {strategy_id} stopped")
        return True

    def get_portfolio_status(self) -> Dict[str, Any]:
        """
        포트폴리오 상태 조회
        """
        if not self.node:
            return {}

        portfolio = self.node.portfolio

        return {
            "balance_total": portfolio.balance_total().as_dict() if portfolio.balance_total() else None,
            "balances": {
                str(account_id): {
                    str(currency): float(balance)
                    for currency, balance in portfolio.balances(account_id).items()
                }
                for account_id in portfolio.account_ids()
            },
            "margins": {
                str(account_id): {
                    str(currency): float(margin)
                    for currency, margin in portfolio.margins(account_id).items()
                }
                for account_id in portfolio.account_ids()
            },
            "unrealized_pnls": {
                str(account_id): {
                    str(currency): float(pnl)
                    for currency, pnl in portfolio.unrealized_pnls(account_id).items()
                }
                for account_id in portfolio.account_ids()
            },
            "net_exposures": {
                str(account_id): {
                    str(currency): float(exposure)
                    for currency, exposure in portfolio.net_exposures(account_id).items()
                }
                for account_id in portfolio.account_ids()
            }
        }

    def get_strategy_performance(self, strategy_id: str) -> Dict[str, Any]:
        """
        전략 성과 조회
        """
        if not self.node or strategy_id not in self.strategies:
            return {}

        # Nautilus의 내장 성과 분석 사용
        report = self.node.portfolio.analyzer.get_performance_stats_pnls(
            strategy_id=StrategyId(strategy_id)
        )

        return report

    def get_active_orders(self, strategy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        활성 주문 조회
        """
        if not self.node:
            return []

        cache = self.node.cache

        if strategy_id:
            orders = cache.orders_open(strategy_id=StrategyId(strategy_id))
        else:
            orders = cache.orders_open()

        return [order.to_dict() for order in orders]

    def get_positions(self, strategy_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        포지션 조회
        """
        if not self.node:
            return []

        cache = self.node.cache

        if strategy_id:
            positions = cache.positions_open(strategy_id=StrategyId(strategy_id))
        else:
            positions = cache.positions_open()

        return [position.to_dict() for position in positions]

    def get_risk_metrics(self) -> Dict[str, Any]:
        """
        리스크 메트릭 조회
        """
        if not self.node:
            return {}

        risk_engine = self.node.risk_engine

        return {
            "max_order_submit_rate": risk_engine.config.max_order_submit_rate,
            "max_order_modify_rate": risk_engine.config.max_order_modify_rate,
            "max_notionals": risk_engine.config.max_notional_per_order,
            "trading_states": {
                str(k): str(v) for k, v in risk_engine.trading_states.items()
            }
        }

    async def subscribe_market_data(
        self,
        instrument_id: str,
        data_types: List[str]
    ):
        """
        시장 데이터 구독
        """
        if not self.node:
            raise RuntimeError("Engine not initialized")

        client = self.node.data_engine.clients.get(ClientId("BINANCE"))
        if not client:
            raise RuntimeError("Binance client not found")

        instrument = InstrumentId.from_str(instrument_id)

        for data_type in data_types:
            if data_type == "trades":
                client.subscribe_trades(instrument)
            elif data_type == "quotes":
                client.subscribe_quotes(instrument)
            elif data_type == "orderbook":
                client.subscribe_order_book_deltas(instrument)

        logger.info(f"Subscribed to {data_types} for {instrument_id}")

    async def unsubscribe_market_data(
        self,
        instrument_id: str,
        data_types: List[str]
    ):
        """
        시장 데이터 구독 해제
        """
        if not self.node:
            raise RuntimeError("Engine not initialized")

        client = self.node.data_engine.clients.get(ClientId("BINANCE"))
        if not client:
            raise RuntimeError("Binance client not found")

        instrument = InstrumentId.from_str(instrument_id)

        for data_type in data_types:
            if data_type == "trades":
                client.unsubscribe_trades(instrument)
            elif data_type == "quotes":
                client.unsubscribe_quotes(instrument)
            elif data_type == "orderbook":
                client.unsubscribe_order_book_deltas(instrument)

        logger.info(f"Unsubscribed from {data_types} for {instrument_id}")


# Singleton instance
nautilus_engine = NautilusEngine()