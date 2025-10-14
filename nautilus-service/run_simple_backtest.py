#!/usr/bin/env python3
"""
Simple Backtest with Binance Data
"""
import asyncio
import pandas as pd
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

from nautilus_trader.backtest.engine import BacktestEngine, BacktestEngineConfig
from nautilus_trader.config import LoggingConfig
from nautilus_trader.model.currencies import USDT
from nautilus_trader.model.enums import AccountType, OmsType, account_type_to_str
from nautilus_trader.model.identifiers import TraderId, Venue, InstrumentId
from nautilus_trader.model.objects import Money
from nautilus_trader.model.data import BarType
from nautilus_trader.persistence.wranglers import BarDataWrangler
from nautilus_trader.test_kit.providers import TestInstrumentProvider

# Import Nautilus built-in strategies (only those with Config classes)
from nautilus_trader.examples.strategies.ema_cross import EMACross, EMACrossConfig
from nautilus_trader.examples.strategies.ema_cross_trailing_stop import EMACrossTrailingStop, EMACrossTrailingStopConfig
from nautilus_trader.examples.strategies.ema_cross_bracket import EMACrossBracket, EMACrossBracketConfig
from nautilus_trader.examples.strategies.ema_cross_stop_entry import EMACrossStopEntry, EMACrossStopEntryConfig
from nautilus_trader.examples.strategies.orderbook_imbalance import OrderBookImbalance, OrderBookImbalanceConfig
from nautilus_trader.examples.strategies.volatility_market_maker import VolatilityMarketMaker, VolatilityMarketMakerConfig


async def download_binance_data(symbol="BTCUSDT", days=7):
    """Download historical data from Binance"""
    import httpx
    
    print(f"\n[DATA] Downloading {symbol} data for last {days} days...")
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    url = "https://api.binance.com/api/v3/klines"
    params = {
        "symbol": symbol,
        "interval": "1m",
        "startTime": int(start_time.timestamp() * 1000),
        "endTime": int(end_time.timestamp() * 1000),
        "limit": 1000
    }
    
    all_data = []
    
    async with httpx.AsyncClient() as client:
        while True:
            response = await client.get(url, params=params, timeout=30.0)
            
            if response.status_code != 200:
                print(f"❌ Error: {response.status_code}")
                break
            
            data = response.json()
            
            if not data:
                break
            
            all_data.extend(data)
            print(f"   Downloaded {len(all_data)} bars...")
            
            # Update start time for next batch
            last_time = data[-1][0]
            params["startTime"] = last_time + 1
            
            if len(data) < 1000:
                break
    
    # Convert to DataFrame
    df = pd.DataFrame(all_data, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_volume', 'trades', 'taker_buy_base',
        'taker_buy_quote', 'ignore'
    ])
    
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms', utc=True)
    
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df[col] = df[col].astype(float)
    
    # Set timestamp as index (required by BarDataWrangler)
    df = df.set_index('timestamp')
    df = df[['open', 'high', 'low', 'close', 'volume']]
    
    print(f"[OK] Downloaded {len(df)} bars")
    print(f"   Period: {df.index.min()} to {df.index.max()}")
    
    return df


def run_backtest_with_data(df, symbol="BTCUSDT", strategy_type="ema_cross"):
    """Run backtest with downloaded data"""
    print("\n[BACKTEST] Starting...")
    
    # 1. Create backtest config
    config = BacktestEngineConfig(
        trader_id=TraderId("BACKTESTER-001"),
        logging=LoggingConfig(log_level="INFO"),
    )
    
    engine = BacktestEngine(config=config)
    
    # 2. Add venue
    engine.add_venue(
        venue=Venue("BINANCE"),
        oms_type=OmsType.NETTING,
        account_type=AccountType.MARGIN,  # Use MARGIN for CurrencyPair instruments
        base_currency=USDT,
        starting_balances=[Money(10000, USDT)],
    )
    
    # 3. Create instrument
    instrument = TestInstrumentProvider.btcusdt_binance()
    engine.add_instrument(instrument)
    
    # 4. Wrangle bar data
    print("   Processing bar data...")
    bar_type = BarType.from_str(f"{symbol}.BINANCE-1-MINUTE-LAST-EXTERNAL")
    wrangler = BarDataWrangler(
        bar_type=bar_type,
        instrument=instrument,
    )
    
    bars = wrangler.process(
        data=df,
        ts_init_delta=1,
    )
    
    print(f"   Processed {len(bars)} bars")
    
    # 5. Add bars to engine
    engine.add_data(bars)
    
    # 6. Create and add strategy based on type (using Nautilus built-in strategies)
    instrument_id = InstrumentId.from_str(f"{symbol}.BINANCE")
    bar_type = BarType.from_str(f"{symbol}.BINANCE-1-MINUTE-LAST-EXTERNAL")
    
    if strategy_type == "ema_cross":
        strategy_config = EMACrossConfig(
            instrument_id=instrument_id,
            bar_type=bar_type,
            fast_ema_period=10,
            slow_ema_period=20,
            trade_size=Decimal("0.01"),
        )
        strategy = EMACross(config=strategy_config)
        print(f"   Strategy: EMA Cross (Fast: 10, Slow: 20)")
    
    elif strategy_type == "ema_trailing":
        strategy_config = EMACrossTrailingStopConfig(
            instrument_id=instrument_id,
            bar_type=bar_type,
            fast_ema_period=10,
            slow_ema_period=20,
            trade_size=Decimal("0.01"),
            atr_period=20,
            trailing_atr_multiple=2.0,
            trailing_offset_type="PRICE",
            trigger_type="LAST_TRADE",
        )
        strategy = EMACrossTrailingStop(config=strategy_config)
        print(f"   Strategy: EMA Cross + Trailing Stop (ATR: 20, Multiple: 2.0x)")
    
    elif strategy_type == "ema_bracket":
        strategy_config = EMACrossBracketConfig(
            instrument_id=instrument_id,
            bar_type=bar_type,
            fast_ema_period=10,
            slow_ema_period=20,
            trade_size=Decimal("0.01"),
            atr_period=20,
            bracket_distance_atr=3.0,
        )
        strategy = EMACrossBracket(config=strategy_config)
        print(f"   Strategy: EMA Cross + Bracket (ATR: 20, Distance: 3.0x)")
    
    elif strategy_type == "ema_stop_entry":
        strategy_config = EMACrossStopEntryConfig(
            instrument_id=instrument_id,
            bar_type=bar_type,
            fast_ema_period=10,
            slow_ema_period=20,
            trade_size=Decimal("0.01"),
            atr_period=20,
            trailing_atr_multiple=3.0,
            trailing_offset_type="PRICE",
            trailing_offset=Decimal("100"),
            trigger_type="LAST_TRADE",
        )
        strategy = EMACrossStopEntry(config=strategy_config)
        print(f"   Strategy: EMA Cross + Stop Entry (ATR: 20, Offset: 100)")
    
    elif strategy_type == "orderbook":
        strategy_config = OrderBookImbalanceConfig(
            instrument_id=instrument_id,
            max_trade_size=Decimal("0.01"),
        )
        strategy = OrderBookImbalance(config=strategy_config)
        print(f"   Strategy: Orderbook Imbalance")
    
    elif strategy_type == "volatility_mm":
        strategy_config = VolatilityMarketMakerConfig(
            instrument_id=instrument_id,
            bar_type=bar_type,
            atr_period=20,
            atr_multiple=2.0,
            trade_size=Decimal("0.01"),
        )
        strategy = VolatilityMarketMaker(config=strategy_config)
        print(f"   Strategy: Volatility Market Maker (ATR: 20)")
    
    else:
        raise ValueError(f"Unknown strategy type: {strategy_type}")
    
    engine.add_strategy(strategy)
    
    # 7. Run backtest
    print("   Running backtest...")
    engine.run()
    
    # 8. Print results
    print("\n" + "=" * 60)
    print("BACKTEST RESULTS")
    print("=" * 60)
    
    # Get account
    account = engine.trader.generate_account_report(Venue("BINANCE"))
    print(account)
    
    # Get positions
    print("\n[POSITIONS]:")
    positions = engine.trader.generate_positions_report()
    if positions is not None and not positions.empty:
        print(positions)
    else:
        print("No positions opened during backtest")
    
    # Get orders
    print("\n[ORDERS]:")
    orders = engine.trader.generate_order_fills_report()
    if orders is not None and not orders.empty:
        print(orders)
    else:
        print("No orders executed during backtest")
    
    print("\n" + "=" * 60)
    
    # Cleanup
    engine.dispose()
    
    return True


async def main():
    import sys
    
    # Strategy registry with descriptions
    STRATEGIES = {
        "ema_cross": {
            "name": "EMA Cross",
            "description": "기본 EMA 크로스오버 전략 (빠른 추세 추종)",
            "params": "Fast EMA: 10, Slow EMA: 20"
        },
        "ema_trailing": {
            "name": "EMA Cross + Trailing Stop",
            "description": "EMA 크로스 + ATR 기반 트레일링 스탑 (손실 제한)",
            "params": "Fast: 10, Slow: 20, ATR: 2.0x"
        },
        "ema_bracket": {
            "name": "EMA Cross + Bracket Orders",
            "description": "EMA 크로스 + 자동 손절/익절 (리스크 관리)",
            "params": "Fast: 10, Slow: 20, SL: 20 ticks, TP: 100 ticks"
        },
        "ema_stop_entry": {
            "name": "EMA Cross + Stop Entry",
            "description": "EMA 크로스 + Stop Entry 주문 (지연 진입)",
            "params": "Fast: 10, Slow: 20"
        },
        "volatility_mm": {
            "name": "Volatility Market Maker",
            "description": "변동성 기반 마켓 메이킹 (양방향 거래)",
            "params": "ATR Period: 20, ATR Multiple: 2.0"
        },
        "orderbook": {
            "name": "Orderbook Imbalance",
            "description": "호가창 불균형 기반 전략 (고빈도 매매)",
            "params": "Max Trade Size: 0.01"
        }
    }
    
    # Get strategy type from command line argument
    if len(sys.argv) > 1:
        if sys.argv[1] in ["--list", "-l", "list"]:
            print("=" * 80)
            print("[전략 목록] 사용 가능한 전략")
            print("=" * 80)
            for key, info in STRATEGIES.items():
                print(f"\n[{key}]")
                print(f"   이름: {info['name']}")
                print(f"   설명: {info['description']}")
                print(f"   파라미터: {info['params']}")
            print("\n" + "=" * 80)
            print("사용법: python run_simple_backtest.py [전략이름]")
            print("예시: python run_simple_backtest.py ema_trailing")
            print("=" * 80)
            return
        strategy_type = sys.argv[1]
    else:
        strategy_type = "ema_cross"
    
    if strategy_type not in STRATEGIES:
        print(f"[ERROR] 알 수 없는 전략: {strategy_type}")
        print(f"사용 가능한 전략: {', '.join(STRATEGIES.keys())}")
        print("전략 목록 보기: python run_simple_backtest.py --list")
        return
    
    strategy_info = STRATEGIES[strategy_type]
    
    print("=" * 80)
    print(f"[NAUTILUS BACKTEST] {strategy_info['name'].upper()}")
    print("=" * 80)
    print(f"설명: {strategy_info['description']}")
    print(f"파라미터: {strategy_info['params']}")
    print("=" * 80)
    
    # Download data
    symbol = "BTCUSDT"
    days = 30
    
    print(f"\n[설정]")
    print(f"  심볼: {symbol}")
    print(f"  기간: 최근 {days}일")
    print(f"  초기 자본: 10,000 USDT")
    
    df = await download_binance_data(symbol=symbol, days=days)
    
    if df is None or len(df) == 0:
        print("[ERROR] No data downloaded. Exiting.")
        return
    
    # Run backtest with selected strategy
    run_backtest_with_data(df, symbol=symbol, strategy_type=strategy_type)
    
    print("\n[OK] Backtest completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())

