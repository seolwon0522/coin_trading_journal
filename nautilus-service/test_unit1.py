#!/usr/bin/env python
"""
Unit 1 검증 테스트
NautilusTrader가 제대로 작동하는지 확인
"""

import asyncio
import sys
from pathlib import Path

# Add parent to path
sys.path.append(str(Path(__file__).parent))

from nautilus_trader.live.node import TradingNode
from nautilus_trader.backtest.engine import BacktestEngine

from app.core.configs import get_live_trading_config, get_backtest_config, EMACrossConfig
from app.strategies.ema_cross import EMACrossStrategy


async def test_live_node():
    """Live Trading Node 테스트"""
    print("\n=== Testing Live Trading Node ===")

    try:
        # 1. Config 생성
        print("1. Creating config...")
        config = get_live_trading_config()
        print("✅ Config created")

        # 2. TradingNode 생성
        print("2. Creating TradingNode...")
        node = TradingNode(config)
        print("✅ TradingNode created")

        # 3. Build
        print("3. Building node...")
        node.build()
        print("✅ Node built")

        # 4. 전략 추가
        print("4. Adding strategy...")
        strategy_config = EMACrossConfig(
            instrument_id="BTCUSDT.BINANCE",
            bar_type="BTCUSDT.BINANCE-1-MINUTE-LAST-EXTERNAL",
        )
        strategy = EMACrossStrategy(strategy_config)
        node.trader.add_strategy(strategy)
        print(f"✅ Strategy added: {strategy.id}")

        # 5. 노드 시작
        print("5. Starting node...")
        await node.start()
        print("✅ Node started")

        # 6. 상태 확인
        print("\n=== Node Status ===")
        print(f"Is running: {node.is_running}")
        print(f"Trader ID: {node.trader_id}")
        print(f"Machine ID: {node.machine_id}")
        print(f"Instance ID: {node.instance_id}")
        print(f"Strategies: {[str(s.id) for s in node.trader.strategies()]}")

        # 7. Portfolio 확인
        print("\n=== Portfolio Status ===")
        portfolio = node.portfolio
        print(f"Accounts: {len(portfolio.accounts())}")
        print(f"Open positions: {len(portfolio.positions_open())}")

        # 8. Cache 확인
        print("\n=== Cache Status ===")
        cache = node.cache
        print(f"Instruments: {len(cache.instruments())}")
        print(f"Orders: {len(cache.orders())}")

        # 9. 잠시 실행
        print("\n⏱️ Running for 5 seconds...")
        await asyncio.sleep(5)

        # 10. 정지
        print("\n10. Stopping node...")
        await node.stop()
        await node.dispose()
        print("✅ Node stopped")

        print("\n✅ Live Trading Node test PASSED!")
        return True

    except Exception as e:
        print(f"\n❌ Live Trading Node test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_backtest_node():
    """Backtest Engine 테스트"""
    print("\n=== Testing Backtest Engine ===")

    try:
        # 1. Config 생성
        print("1. Creating config...")
        config = get_backtest_config()
        print("✅ Config created")

        # 2. BacktestEngine 생성
        print("2. Creating BacktestEngine...")
        engine = BacktestEngine(config=config)
        print("✅ BacktestEngine created")

        # 3. 전략 추가
        print("3. Adding strategy...")
        strategy_config = EMACrossConfig(
            instrument_id="BTCUSDT.BINANCE",
            bar_type="BTCUSDT.BINANCE-1-MINUTE-LAST-EXTERNAL",
        )
        strategy = EMACrossStrategy(strategy_config)
        engine.add_strategy(strategy)
        print(f"✅ Strategy added: {strategy.id}")

        print("\n=== Backtest Engine Status ===")
        print(f"Trader ID: {engine.trader_id}")
        print(f"Strategies: {[str(s.id) for s in engine.trader.strategies()]}")

        # 데이터가 없으므로 실제 백테스트는 스킵
        print("\n⚠️ Skipping actual backtest run (no data loaded)")

        # 5. Dispose
        print("\n5. Disposing engine...")
        engine.dispose()
        print("✅ Engine disposed")

        print("\n✅ Backtest Engine test PASSED!")
        return True

    except Exception as e:
        print(f"\n❌ Backtest Engine test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """메인 테스트"""
    print("=" * 50)
    print("UNIT 1: Core Infrastructure Test")
    print("=" * 50)

    # Test results
    results = []

    # Live node test
    result = await test_live_node()
    results.append(("Live Trading Node", result))

    # Backtest node test
    result = await test_backtest_node()
    results.append(("Backtest Node", result))

    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    for name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name}: {status}")

    all_passed = all(r[1] for r in results)

    if all_passed:
        print("\n🎉 ALL TESTS PASSED! Unit 1 완료!")
    else:
        print("\n⚠️ Some tests failed. Please check the logs.")

    return all_passed


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)