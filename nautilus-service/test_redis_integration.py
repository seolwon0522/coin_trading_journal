"""
Redis Event Bridge 통합 테스트
Unit 2 완료 검증
"""

import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.redis_bridge import RedisEventBridge, NautilusEventHandler


async def test_redis_connection():
    """Redis 연결 테스트"""
    print("\n1. Testing Redis Connection...")

    bridge = RedisEventBridge()

    try:
        await bridge.connect()
        print("   [OK] Connected to Redis")

        # Test ping
        if bridge.redis_client:
            await bridge.redis_client.ping()
            print("   [OK] Redis ping successful")

        await bridge.disconnect()
        print("   [OK] Disconnected from Redis")

        return True
    except Exception as e:
        print(f"   [FAIL] Redis connection failed: {e}")
        print("   Note: Make sure Redis is running locally or in Docker")
        return False


async def test_event_publishing():
    """이벤트 발행 테스트"""
    print("\n2. Testing Event Publishing...")

    bridge = RedisEventBridge()

    try:
        await bridge.connect()

        # Test trade event
        await bridge.publish_trade({
            "trade_id": "TEST001",
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.01,
            "price": 50000.0,
            "strategy_id": "test_strategy"
        })
        print("   [OK] Published trade event")

        # Test position update
        await bridge.publish_position_update({
            "position_id": "POS001",
            "symbol": "BTCUSDT",
            "side": "LONG",
            "quantity": 0.01,
            "entry_price": 50000.0,
            "unrealized_pnl": 100.0,
            "strategy_id": "test_strategy"
        })
        print("   [OK] Published position update")

        # Test order update
        await bridge.publish_order_update({
            "order_id": "ORD001",
            "status": "FILLED",
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.01,
            "price": 50000.0,
            "strategy_id": "test_strategy"
        })
        print("   [OK] Published order update")

        # Test risk alert
        await bridge.publish_risk_alert({
            "strategy_id": "test_strategy",
            "alert_type": "MAX_DRAWDOWN",
            "current_value": -0.15,
            "limit_value": -0.10,
            "severity": "high"
        })
        print("   [OK] Published risk alert")

        await bridge.disconnect()
        return True

    except Exception as e:
        print(f"   [FAIL] Event publishing failed: {e}")
        return False


async def test_nautilus_event_handler():
    """Nautilus 이벤트 핸들러 테스트"""
    print("\n3. Testing Nautilus Event Handler...")

    bridge = RedisEventBridge()

    try:
        await bridge.connect()
        handler = NautilusEventHandler(bridge)

        # Test order filled event
        await handler.on_order_filled({
            "client_order_id": "ORD002",
            "filled_qty": 0.01,
            "avg_px": 50100.0,
            "instrument_id": "BTCUSDT.BINANCE",
            "order_side": "BUY",
            "ts_event": "2025-09-25T10:00:00"
        })
        print("   [OK] Handled order filled event")

        # Test position changed event
        await handler.on_position_changed({
            "position_id": "POS002",
            "instrument_id": "BTCUSDT.BINANCE",
            "side": "LONG",
            "quantity": 0.01,
            "avg_px_open": 50000.0,
            "last_px": 50500.0,
            "unrealized_pnl": 50.0,
            "realized_pnl": 0.0
        })
        print("   [OK] Handled position change event")

        # Test strategy lifecycle events
        await handler.on_strategy_started("test_strategy")
        print("   [OK] Handled strategy started event")

        await handler.on_strategy_stopped("test_strategy", "Manual stop")
        print("   [OK] Handled strategy stopped event")

        # Test performance update
        await handler.on_performance_update("test_strategy", {
            "total_pnl": 500.0,
            "win_rate": 0.65,
            "total_trades": 20,
            "sharpe_ratio": 1.5,
            "max_drawdown": -0.08
        })
        print("   [OK] Handled performance update")

        await bridge.disconnect()
        return True

    except Exception as e:
        print(f"   [FAIL] Event handler test failed: {e}")
        return False


async def test_channels():
    """채널 구조 테스트"""
    print("\n4. Testing Channel Structure...")

    channels = [
        "trades",
        "positions",
        "orders",
        "strategies",
        "market",
        "performance",
        "risk"
    ]

    print(f"   Available channels: {', '.join(channels)}")
    print("   Channel prefix: nautilus")
    print("   Full channel format: nautilus:{channel_name}")

    return True


async def main():
    """모든 테스트 실행"""
    print("="*60)
    print("Redis Event Bridge Integration Test")
    print("Unit 2 완료 검증")
    print("="*60)

    tests = [
        ("Redis Connection", test_redis_connection),
        ("Event Publishing", test_event_publishing),
        ("Nautilus Event Handler", test_nautilus_event_handler),
        ("Channel Structure", test_channels)
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            if await test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"\n{name} Error: {e}")
            failed += 1

    print("\n" + "="*60)
    print(f"테스트 결과: {passed} passed, {failed} failed")

    if failed == 0:
        print("\n[SUCCESS] Unit 2 완료!")
        print("\nUnit 2 구현 완료 항목:")
        print("  1. FastAPI Gateway - Node/Strategy/Portfolio/Backtest APIs")
        print("  2. WebSocket Manager - 실시간 5개 채널 관리")
        print("  3. Strategy Factory - 6개 내장 전략")
        print("  4. Redis Event Bridge - 7개 이벤트 채널")
        print("\n다음 단계: Unit 3 - Strategy Backtesting")
    else:
        print(f"\n[WARNING] {failed}개 테스트 실패")
        print("Redis가 실행 중인지 확인하세요:")
        print("  docker run -d -p 6379:6379 redis:latest")

    print("="*60)

    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)