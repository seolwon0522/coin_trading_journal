"""
Nautilus TradingNode Core Setup
공식 문서 기반 올바른 구현
"""

import asyncio
import os
from pathlib import Path
from typing import Optional, Dict, Any
from decimal import Decimal
import logging

from nautilus_trader.adapters.binance import BINANCE
from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.config import BinanceDataClientConfig, BinanceExecClientConfig
from nautilus_trader.adapters.binance.factories import BinanceLiveDataClientFactory, BinanceLiveExecClientFactory
from nautilus_trader.backtest.node import BacktestNode, BacktestNodeConfig
from nautilus_trader.config import (
    CacheConfig,
    DataEngineConfig,
    ExecEngineConfig,
    InstrumentProviderConfig,
    LiveDataEngineConfig,
    LiveExecEngineConfig,
    LiveRiskEngineConfig,
    LoggingConfig,
    MessageBusConfig,
    RiskEngineConfig,
    StreamingConfig,
    TradingNodeConfig,
)
from nautilus_trader.live.node import TradingNode
from nautilus_trader.model.identifiers import TraderId, Venue
from nautilus_trader.persistence.catalog import ParquetDataCatalog

from app.config.settings import settings

logger = logging.getLogger(__name__)


class NautilusTradingSystem:
    """
    Nautilus Trading System - 공식 패턴 준수
    Live와 Backtest 모드를 지원하는 통합 시스템
    """

    def __init__(self, mode: str = "live", catalog_path: str = "./catalog"):
        self.mode = mode
        self.catalog_path = Path(catalog_path)
        self.catalog_path.mkdir(exist_ok=True)

        # 로그 디렉토리 생성
        self.log_path = Path("./logs")
        self.log_path.mkdir(exist_ok=True)

        # 노드 인스턴스
        self.node: Optional[TradingNode] = None
        self.trader_id = TraderId("TRADER-001")

        # 환경 변수에서 API 키 로드
        self.api_key = os.getenv(
            "BINANCE_TESTNET_API_KEY" if settings.is_testnet else "BINANCE_API_KEY",
            ""
        )
        self.api_secret = os.getenv(
            "BINANCE_TESTNET_API_SECRET" if settings.is_testnet else "BINANCE_API_SECRET",
            ""
        )

        self._strategies = {}  # strategy_id -> strategy instance

    def build_live_config(self) -> TradingNodeConfig:
        """
        Live Trading 설정 생성 - 공식 문서 패턴
        """
        return TradingNodeConfig(
            trader_id=self.trader_id,

            # Logging 설정
            logging=LoggingConfig(
                log_level="INFO",
                log_to_console=True,
                log_file_path=str(self.log_path / "nautilus_live.log"),
                bypass_logging=False,
            ),

            # Cache 설정
            cache=CacheConfig(
                database=None,  # In-memory cache
                encoding="msgpack",
                timestamps_as_utc=True,
                buffer_interval_ms=100,
            ),

            # MessageBus 설정 (Event-driven architecture의 핵심)
            message_bus=MessageBusConfig(
                database=None,
                encoding="msgpack",
                timestamps_as_utc=True,
                buffer_interval_ms=100,
                streams_prefix="nautilus",
                use_trader_prefix=True,
                use_trader_id=True,
                use_instance_id=True,
                autotrim_mins=30,
            ),

            # Data Engine 설정
            data_engine=LiveDataEngineConfig(
                qsize=10000,
                allow_any_connection=True,
            ),

            # Execution Engine 설정
            exec_engine=LiveExecEngineConfig(
                qsize=10000,
                allow_any_connection=True,
                reconciliation=True,
            ),

            # Risk Engine 설정
            risk_engine=LiveRiskEngineConfig(
                bypass=False,  # Risk checks 활성화
                max_order_submit_rate=100,
                max_order_modify_rate=50,
                max_notional_per_order={
                    "BINANCE": Decimal("50000.0")
                },
            ),

            # Streaming 설정 (선택적)
            streaming=StreamingConfig(
                catalog_path=str(self.catalog_path),
                fs_protocol="file",
                flush_interval_ms=1000,
                auto_flush=True,
                include_types=None,  # All types
            ) if settings.enable_streaming else None,

            # Binance 클라이언트 설정 (공식 문서 패턴)
            data_clients={
                "BINANCE": BinanceDataClientConfig(
                    api_key=self.api_key,
                    api_secret=self.api_secret,
                    account_type=BinanceAccountType.SPOT,  # SPOT, MARGIN, USDT_FUTURE, COIN_FUTURE
                    testnet=settings.is_testnet,
                    us=False,  # Binance.com 사용
                ),
            },

            exec_clients={
                "BINANCE": BinanceExecClientConfig(
                    api_key=self.api_key,
                    api_secret=self.api_secret,
                    account_type=BinanceAccountType.SPOT,
                    testnet=settings.is_testnet,
                    us=False,
                ),
            },

            # Timeout 설정
            timeout_connection=20.0,
            timeout_reconciliation=10.0,
            timeout_portfolio=10.0,
            timeout_disconnection=10.0,
            timeout_post_stop=5.0,
        )

    def build_backtest_config(self) -> BacktestNodeConfig:
        """
        Backtest 설정 생성
        """
        return BacktestNodeConfig(
            trader_id=self.trader_id,

            logging=LoggingConfig(
                log_level="INFO",
                log_to_console=True,
                log_file_path=str(self.log_path / "nautilus_backtest.log"),
            ),

            cache=CacheConfig(
                database=None,
                encoding="msgpack",
            ),

            message_bus=MessageBusConfig(
                database=None,
                encoding="msgpack",
            ),

            data_engine=DataEngineConfig(
                time_bars_build_with_no_updates=True,
                time_bars_timestamp_on_close=True,
                validate_data_sequence=True,
            ),

            exec_engine=ExecEngineConfig(
                load_cache=True,
            ),

            risk_engine=RiskEngineConfig(
                bypass=False,
                max_order_submit_rate=100,
                max_notional_per_order={
                    "BINANCE": Decimal("50000.0")
                },
            ),

            streaming=StreamingConfig(
                catalog_path=str(self.catalog_path),
                fs_protocol="file",
            ) if settings.enable_streaming else None,

            # Backtest specific
            run_analysis=True,
        )

    async def initialize(self) -> None:
        """
        노드 초기화
        """
        if self.node is not None:
            logger.warning(f"{self.mode.upper()} node already initialized")
            return

        if self.mode == "live":
            config = self.build_live_config()
            self.node = TradingNode(config=config)
        elif self.mode == "backtest":
            config = self.build_backtest_config()
            self.node = BacktestNode(config=config)
        else:
            raise ValueError(f"Invalid mode: {self.mode}")

        # Build the node
        self.node.build()

        logger.info(f"Nautilus {self.mode.upper()} node initialized")

    async def start(self) -> None:
        """
        노드 시작
        """
        if self.node is None:
            await self.initialize()

        if self.mode == "live":
            await self.node.start()
        elif self.mode == "backtest":
            await self.node.run()

        logger.info(f"Nautilus {self.mode.upper()} node started")

    async def stop(self) -> None:
        """
        노드 정지
        """
        if self.node is None:
            return

        if self.mode == "live":
            await self.node.stop()

        await self.node.dispose()

        logger.info(f"Nautilus {self.mode.upper()} node stopped")

    def add_strategy(self, strategy) -> None:
        """
        전략 추가
        """
        if self.node is None:
            raise RuntimeError("Node must be initialized first")

        self.node.trader.add_strategy(strategy)
        self._strategies[str(strategy.id)] = strategy

        logger.info(f"Strategy {strategy.id} added")

    def get_strategy(self, strategy_id: str):
        """
        전략 가져오기
        """
        return self._strategies.get(strategy_id)

    def remove_strategy(self, strategy_id: str) -> bool:
        """
        전략 제거
        """
        strategy = self._strategies.get(strategy_id)
        if strategy is None:
            return False

        self.node.trader.remove_strategy(strategy)
        del self._strategies[strategy_id]

        logger.info(f"Strategy {strategy_id} removed")
        return True

    @property
    def is_running(self) -> bool:
        """
        노드 실행 상태
        """
        if self.node is None:
            return False
        return self.node.is_running if self.mode == "live" else False

    @property
    def cache(self):
        """Cache 접근"""
        return self.node.cache if self.node else None

    @property
    def portfolio(self):
        """Portfolio 접근"""
        return self.node.portfolio if self.node else None

    @property
    def msgbus(self):
        """MessageBus 접근"""
        return self.node.msgbus if self.node else None

    @property
    def data_engine(self):
        """DataEngine 접근"""
        return self.node.data_engine if self.node else None

    @property
    def exec_engine(self):
        """ExecutionEngine 접근"""
        return self.node.exec_engine if self.node else None

    @property
    def risk_engine(self):
        """RiskEngine 접근"""
        return self.node.risk_engine if self.node else None


# 싱글톤 인스턴스
_trading_system: Optional[NautilusTradingSystem] = None


def get_trading_system(mode: str = "live") -> NautilusTradingSystem:
    """
    TradingSystem 싱글톤 인스턴스 반환
    """
    global _trading_system

    if _trading_system is None or _trading_system.mode != mode:
        _trading_system = NautilusTradingSystem(mode=mode)

    return _trading_system