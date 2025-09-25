#!/usr/bin/env python
"""
Nautilus Trader Backtest Example
공식 예제 패턴 기반
"""

import asyncio
import os
from decimal import Decimal
from pathlib import Path

from nautilus_trader.adapters.binance import BINANCE
from nautilus_trader.backtest.engine import BacktestEngine, BacktestEngineConfig
from nautilus_trader.config import (
    CacheConfig,
    DataEngineConfig,
    ExecEngineConfig,
    RiskEngineConfig,
    LoggingConfig,
)
from nautilus_trader.model.currencies import USDT
from nautilus_trader.model.enums import AccountType, OmsType
from nautilus_trader.model.identifiers import TraderId, Venue
from nautilus_trader.model.objects import Money

# Import our strategy
from strategies.ema_cross import EMACrossStrategy, EMACrossConfig


def get_backtest_config() -> BacktestEngineConfig:
    """BacktestEngine 설정 생성"""
    return BacktestEngineConfig(
        trader_id=TraderId("BACKTESTER-001"),
        logging=LoggingConfig(
            log_level="INFO",
        ),
        cache=CacheConfig(),
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
            max_order_submit_rate="100/00:00:01",  # 문자열 형식
            max_order_modify_rate="50/00:00:01",   # 문자열 형식
        ),
        run_analysis=True,
    )


def run_backtest():
    """백테스트 실행"""

    # 1. BacktestEngine 생성
    config = get_backtest_config()
    engine = BacktestEngine(config=config)

    # 2. Venue 추가 (Binance)
    engine.add_venue(
        venue=Venue("BINANCE"),
        oms_type=OmsType.NETTING,  # 또는 HEDGING
        account_type=AccountType.SPOT,  # 또는 MARGIN
        base_currency=USDT,
        starting_balances=[Money(10000, USDT)],  # 초기 잔고
    )

    # 3. Instrument 추가 (예: BTCUSDT)
    # 실제로는 데이터와 함께 로드되어야 함
    # instrument = ...
    # engine.add_instrument(instrument)

    # 4. 전략 생성 및 추가
    strategy_config = EMACrossConfig(
        instrument_id="BTCUSDT.BINANCE",
        bar_type="BTCUSDT.BINANCE-1-MINUTE-LAST-EXTERNAL",
        fast_period=10,
        slow_period=20,
        trade_size=Decimal("0.01"),
    )

    strategy = EMACrossStrategy(config=strategy_config)
    engine.add_strategy(strategy=strategy)

    # 5. 데이터 로드
    # 실제로는 DataCatalog나 Provider를 통해 로드
    # engine.add_data(data)

    print("=" * 50)
    print("Nautilus Trader Backtest")
    print("=" * 50)
    print(f"Trader ID: {config.trader_id}")
    print(f"Strategy: {strategy.id}")
    print("=" * 50)

    # 6. 백테스트 실행
    # engine.run()

    # 7. 결과 출력
    # print(engine.trader.generate_account_report(BINANCE_VENUE))
    # print(engine.trader.generate_positions_report())
    # print(engine.trader.generate_order_fills_report())

    print("\n⚠️ 백테스트는 데이터가 필요합니다.")
    print("DataCatalog에서 히스토리컬 데이터를 먼저 다운로드하세요.")

    # 8. 정리
    engine.dispose()


if __name__ == "__main__":
    run_backtest()