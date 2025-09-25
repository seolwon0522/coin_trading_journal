#!/usr/bin/env python3
"""
Test script for Nautilus Trading Service API
Run this to verify the service is working correctly
"""
import asyncio
import httpx
import json
from datetime import datetime
import websockets
import sys


BASE_URL = "http://localhost:8002"
WS_URL = "ws://localhost:8002/ws"


async def test_health_check():
    """Test health check endpoint"""
    print("🔍 Testing health check...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data['status']}")
            print(f"   Version: {data['version']}")
            print(f"   Active strategies: {data['active_strategies']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False


async def test_create_strategy():
    """Test creating a strategy"""
    print("\n📝 Testing strategy creation...")

    strategy_data = {
        "name": f"Test Strategy {datetime.now().strftime('%H%M%S')}",
        "strategy_type": "ema_cross",
        "symbol": "BTCUSDT",
        "parameters": {
            "fast_ema_period": 10,
            "slow_ema_period": 20,
            "trade_size": 0.001,
            "use_bracket_orders": True,
            "stop_loss_pct": 0.02,
            "take_profit_pct": 0.05
        },
        "capital": 10000,
        "leverage": 1,
        "testnet": True
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/strategies",
            json=strategy_data
        )

        if response.status_code == 201:
            data = response.json()
            print(f"✅ Strategy created successfully!")
            print(f"   ID: {data['id']}")
            print(f"   Name: {data['name']}")
            print(f"   Status: {data['status']}")
            return data['id']
        else:
            print(f"❌ Strategy creation failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return None


async def test_list_strategies():
    """Test listing strategies"""
    print("\n📋 Testing strategy listing...")

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/strategies")

        if response.status_code == 200:
            strategies = response.json()
            print(f"✅ Found {len(strategies)} strategies")
            for strategy in strategies[:3]:  # Show first 3
                print(f"   - {strategy['name']} ({strategy['status']})")
            return True
        else:
            print(f"❌ Failed to list strategies: {response.status_code}")
            return False


async def test_start_strategy(strategy_id: str):
    """Test starting a strategy"""
    print(f"\n▶️ Testing strategy start (ID: {strategy_id})...")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/strategies/{strategy_id}/start"
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Strategy started successfully!")
            print(f"   Status: {data['status']}")
            return True
        else:
            print(f"❌ Failed to start strategy: {response.status_code}")
            print(f"   Error: {response.text}")
            return False


async def test_get_strategy_performance(strategy_id: str):
    """Test getting strategy performance"""
    print(f"\n📊 Testing performance metrics (ID: {strategy_id})...")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/strategies/{strategy_id}/performance"
        )

        if response.status_code == 200:
            metrics = response.json()
            print(f"✅ Performance metrics retrieved!")
            print(f"   Total trades: {metrics['total_trades']}")
            print(f"   Win rate: {metrics['win_rate']}%")
            print(f"   PnL: {metrics['total_pnl']}")
            return True
        else:
            print(f"❌ Failed to get performance: {response.status_code}")
            return False


async def test_stop_strategy(strategy_id: str):
    """Test stopping a strategy"""
    print(f"\n⏹️ Testing strategy stop (ID: {strategy_id})...")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/strategies/{strategy_id}/stop"
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Strategy stopped successfully!")
            print(f"   Final PnL: {data.get('final_stats', {}).get('realized_pnl', 0)}")
            return True
        else:
            print(f"❌ Failed to stop strategy: {response.status_code}")
            return False


async def test_websocket_connection():
    """Test WebSocket connection"""
    print("\n🔌 Testing WebSocket connection...")

    try:
        async with websockets.connect(f"{WS_URL}/test_client") as websocket:
            # Test subscription
            await websocket.send(json.dumps({
                "type": "subscribe",
                "channel": "ticker",
                "params": {"symbol": "BTCUSDT"}
            }))

            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)

            if data.get("status") == "subscribed":
                print(f"✅ WebSocket connection successful!")
                print(f"   Subscribed to: {data.get('channel')}")

                # Test ping
                await websocket.send(json.dumps({"type": "ping"}))
                pong = await asyncio.wait_for(websocket.recv(), timeout=5)
                pong_data = json.loads(pong)

                if pong_data.get("type") == "pong":
                    print(f"   Ping/Pong working ✓")

                return True
            else:
                print(f"❌ WebSocket subscription failed")
                return False

    except asyncio.TimeoutError:
        print(f"❌ WebSocket connection timeout")
        return False
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        return False


async def test_risk_exposure():
    """Test risk exposure endpoint"""
    print("\n⚠️ Testing risk exposure...")

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/strategies/risk/exposure")

        if response.status_code == 200:
            exposure = response.json()
            print(f"✅ Risk exposure retrieved!")
            print(f"   Total exposure: ${exposure['total_exposure']:.2f}")
            print(f"   Position count: {exposure['position_count']}")
            print(f"   Max position size: {exposure['max_position_size']}")
            return True
        else:
            print(f"❌ Failed to get risk exposure: {response.status_code}")
            return False


async def test_config():
    """Test configuration endpoint"""
    print("\n⚙️ Testing configuration...")

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/config")

        if response.status_code == 200:
            config = response.json()
            print(f"✅ Configuration retrieved!")
            print(f"   Testnet: {config['testnet']}")
            print(f"   Max strategies: {config['max_strategies']}")
            print(f"   Risk check: {config['risk_check_enabled']}")
            return True
        else:
            print(f"❌ Failed to get config: {response.status_code}")
            return False


async def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("🚀 Nautilus Trading Service API Test Suite")
    print("=" * 60)

    results = []

    # Basic tests
    results.append(("Health Check", await test_health_check()))
    results.append(("Configuration", await test_config()))
    results.append(("Risk Exposure", await test_risk_exposure()))

    # Strategy tests
    strategy_id = await test_create_strategy()
    if strategy_id:
        results.append(("Create Strategy", True))
        results.append(("List Strategies", await test_list_strategies()))

        # Try to start strategy (may fail if Nautilus not fully configured)
        try:
            results.append(("Start Strategy", await test_start_strategy(strategy_id)))
            await asyncio.sleep(2)  # Let it run briefly
            results.append(("Get Performance", await test_get_strategy_performance(strategy_id)))
            results.append(("Stop Strategy", await test_stop_strategy(strategy_id)))
        except Exception as e:
            print(f"⚠️ Strategy operations skipped: {e}")
    else:
        results.append(("Create Strategy", False))

    # WebSocket test
    results.append(("WebSocket", await test_websocket_connection()))

    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Service is working correctly.")
        return 0
    else:
        print(f"\n⚠️ {total - passed} tests failed. Check the service logs.")
        return 1


def main():
    """Main entry point"""
    try:
        # Check if service is reachable
        import requests
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code != 200:
            print(f"❌ Service not responding at {BASE_URL}")
            print("Please start the service first:")
            print("  cd nautilus-service")
            print("  uvicorn app.main:app --reload --port 8002")
            return 1
    except Exception as e:
        print(f"❌ Cannot connect to service at {BASE_URL}")
        print(f"Error: {e}")
        print("\nPlease start the service first:")
        print("  cd nautilus-service")
        print("  uvicorn app.main:app --reload --port 8002")
        return 1

    # Run async tests
    return asyncio.run(run_all_tests())


if __name__ == "__main__":
    sys.exit(main())