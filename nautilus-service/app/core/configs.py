"""
Nautilus Trader Configuration
설정만 관리하면 됨 - NautilusTrader가 나머지는 다 처리
"""

import os
from pathlib import Path
from decimal import Decimal
from typing import Optional

from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.config import BinanceDataClientConfig, BinanceExecClientConfig
from nautilus_trader.config import (
    CacheConfig,
    DataEngineConfig,
    ExecEngineConfig,
    LiveDataEngineConfig,
    LiveExecEngineConfig,
    LiveRiskEngineConfig,
    LoggingConfig,
    MessageBusConfig,
    RiskEngineConfig,
    TradingNodeConfig,
    StrategyConfig,
)
from nautilus_trader.backtest.engine import BacktestEngineConfig
from nautilus_trader.model.identifiers import TraderId


def get_live_trading_config(
    trader_id: str = "TRADER-001",
    log_level: str = "INFO",
) -> TradingNodeConfig:
    """
    Live Trading 설정 생성
    """
    # 환경 변수에서 API 키 로드
    is_testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"

    api_key = os.getenv(
        "BINANCE_TESTNET_API_KEY" if is_testnet else "BINANCE_API_KEY",
        ""
    )
    api_secret = os.getenv(
        "BINANCE_TESTNET_API_SECRET" if is_testnet else "BINANCE_API_SECRET",
        ""
    )

    # 로그 경로
    log_path = Path("./logs")
    log_path.mkdir(exist_ok=True)

    return TradingNodeConfig(
        trader_id=TraderId(trader_id),

        logging=LoggingConfig(
            log_level=log_level,
        ),

        cache=CacheConfig(
            database=None,  # In-memory
            encoding="msgpack",
        ),

        message_bus=MessageBusConfig(
            database=None,
            encoding="msgpack",
            autotrim_mins=30,
        ),

        data_engine=LiveDataEngineConfig(
            qsize=10000,
        ),

        exec_engine=LiveExecEngineConfig(
            qsize=10000,
        ),

        risk_engine=LiveRiskEngineConfig(
            bypass=False,
            max_order_submit_rate="100/00:00:01",  # 초당 100개 주문
            max_order_modify_rate="50/00:00:01",   # 초당 50개 수정
        ),

        data_clients={
            "BINANCE": BinanceDataClientConfig(
                api_key=api_key,
                api_secret=api_secret,
                account_type=BinanceAccountType.SPOT,
                testnet=is_testnet,
                us=False,
            ),
        },

        exec_clients={
            "BINANCE": BinanceExecClientConfig(
                api_key=api_key,
                api_secret=api_secret,
                account_type=BinanceAccountType.SPOT,
                testnet=is_testnet,
                us=False,
            ),
        },

        timeout_connection=20.0,
        timeout_reconciliation=10.0,
        timeout_portfolio=10.0,
        timeout_disconnection=10.0,
        timeout_post_stop=5.0,
    )


def get_backtest_config(
    trader_id: str = "BACKTEST-001",
    catalog_path: str = "./catalog",
) -> BacktestEngineConfig:
    """
    Backtest 설정 생성
    """
    log_path = Path("./logs")
    log_path.mkdir(exist_ok=True)

    return BacktestEngineConfig(
        trader_id=TraderId(trader_id),

        logging=LoggingConfig(
            log_level="INFO",
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
        ),

        exec_engine=ExecEngineConfig(
            load_cache=True,
        ),

        risk_engine=RiskEngineConfig(
            bypass=False,
            max_order_submit_rate="100/00:00:01",  # 초당 100개 주문
            max_order_modify_rate="50/00:00:01",   # 초당 50개 수정
        ),

        run_analysis=True,
    )


# EMA Cross Strategy Config
class EMACrossConfig(StrategyConfig):
    """EMA Cross 전략 설정"""
    instrument_id: str
    bar_type: str
    fast_period: int = 10
    slow_period: int = 20
    trade_size: Decimal = Decimal("0.01")
    max_positions: int = 1
    stop_loss_pct: float = 0.02
    take_profit_pct: float = 0.03


# Market Maker Strategy Config
class MarketMakerConfig(StrategyConfig):
    """Market Maker 전략 설정"""
    instrument_id: str
    spread_bps: int = 10  # basis points
    order_size: Decimal = Decimal("0.1")
    inventory_target: Decimal = Decimal("0.0")
    max_inventory: Decimal = Decimal("1.0")
    order_refresh_tol_bps: int = 5