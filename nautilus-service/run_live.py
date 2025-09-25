#!/usr/bin/env python
"""
Nautilus Trader Live Trading
공식 예제 패턴 기반
"""

import asyncio
import os
from decimal import Decimal
from pathlib import Path

from nautilus_trader.adapters.binance import BINANCE_VENUE
from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.config import BinanceDataClientConfig, BinanceExecClientConfig
from nautilus_trader.adapters.binance.factories import BinanceLiveDataClientFactory, BinanceLiveExecClientFactory
from nautilus_trader.config import (
    CacheConfig,
    LiveDataEngineConfig,
    LiveExecEngineConfig,
    LiveRiskEngineConfig,
    LoggingConfig,
    MessageBusConfig,
    StreamingConfig,
    TradingNodeConfig,
)
from nautilus_trader.live.node import TradingNode
from nautilus_trader.model.identifiers import TraderId

# Import our strategy
from strategies.ema_cross import EMACrossStrategy, EMACrossConfig


def get_live_config() -> TradingNodeConfig:
    """Live Trading 설정"""

    # 환경변수에서 API 키 가져오기
    is_testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"

    if is_testnet:
        api_key = os.getenv("BINANCE_TESTNET_API_KEY", "")
        api_secret = os.getenv("BINANCE_TESTNET_API_SECRET", "")
    else:
        api_key = os.getenv("BINANCE_API_KEY", "")
        api_secret = os.getenv("BINANCE_API_SECRET", "")

    # Logging
    log_path = Path("logs")
    log_path.mkdir(exist_ok=True)

    return TradingNodeConfig(
        trader_id=TraderId("TRADER-001"),

        # Logging
        logging=LoggingConfig(
            log_level="INFO",
            log_to_console=True,
            log_file_path=str(log_path / "nautilus_live.log"),
        ),

        # Cache
        cache=CacheConfig(
            database=None,  # In-memory
            encoding="msgpack",
        ),

        # MessageBus
        message_bus=MessageBusConfig(
            database=None,
            encoding="msgpack",
            autotrim_mins=30,
        ),

        # DataEngine
        data_engine=LiveDataEngineConfig(
            qsize=10000,
        ),

        # ExecutionEngine
        exec_engine=LiveExecEngineConfig(
            qsize=10000,
        ),

        # RiskEngine
        risk_engine=LiveRiskEngineConfig(
            bypass=False,  # Risk checks 활성화
            max_order_submit_rate=100,
            max_order_modify_rate=50,
            max_notional_per_order={
                "BINANCE": Decimal("50000.0")
            },
        ),

        # Binance Data Client
        data_clients={
            "BINANCE": BinanceDataClientConfig(
                api_key=api_key,
                api_secret=api_secret,
                account_type=BinanceAccountType.SPOT,
                testnet=is_testnet,
                us=False,  # Binance.com 사용
            ),
        },

        # Binance Execution Client
        exec_clients={
            "BINANCE": BinanceExecClientConfig(
                api_key=api_key,
                api_secret=api_secret,
                account_type=BinanceAccountType.SPOT,
                testnet=is_testnet,
                us=False,
            ),
        },

        # Timeouts
        timeout_connection=20.0,
        timeout_reconciliation=10.0,
        timeout_portfolio=10.0,
        timeout_disconnection=10.0,
        timeout_post_stop=5.0,
    )


async def main():
    """메인 실행 함수"""

    print("=" * 50)
    print("Nautilus Trader Live Trading")
    print("=" * 50)

    # 1. TradingNode 생성
    config = get_live_config()
    node = TradingNode(config=config)

    # 2. 전략 생성
    strategy_config = EMACrossConfig(
        instrument_id="BTCUSDT.BINANCE",
        bar_type="BTCUSDT.BINANCE-1-MINUTE-LAST-EXTERNAL",
        fast_period=10,
        slow_period=20,
        trade_size=Decimal("0.001"),  # 작은 사이즈로 테스트
    )

    strategy = EMACrossStrategy(config=strategy_config)

    # 3. 전략 추가
    node.trader.add_strategy(strategy)

    print(f"Trader ID: {config.trader_id}")
    print(f"Strategy: {strategy.id}")
    print(f"Testnet: {config.data_clients['BINANCE'].testnet}")
    print("=" * 50)

    # 4. 노드 빌드
    node.build()

    # 5. 노드 시작
    try:
        await node.start()
        print("✅ Trading node started successfully!")
        print("Press Ctrl+C to stop...")

        # 무한 실행
        await asyncio.Event().wait()

    except KeyboardInterrupt:
        print("\n⏹️ Stopping trading node...")

    finally:
        # 6. 정리
        if node.is_running:
            await node.stop()

        await node.dispose()
        print("✅ Trading node stopped cleanly")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")