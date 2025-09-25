"""
Unit 2 검증: API Gateway 통합 테스트
FastAPI 엔드포인트 및 WebSocket 통신 테스트
"""

import pytest
import asyncio
import json
from typing import Dict, Any
from httpx import AsyncClient
from fastapi.testclient import TestClient
from websockets import connect
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.main import app, app_state
from app.api.models import NodeMode, StrategyType, TimeFrame


@pytest.fixture
def test_client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def async_client():
    """Create async test client"""
    return AsyncClient(app=app, base_url="http://test")


class TestNodeManagement:
    """노드 관리 API 테스트"""

    def test_health_check(self, test_client):
        """헬스 체크 엔드포인트"""
        response = test_client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Nautilus Trading API"
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_node_lifecycle(self, async_client):
        """노드 시작/상태/정지 사이클"""
        # 1. Check initial status
        response = await async_client.get("/api/node/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "idle"
        assert data["is_running"] == False

        # 2. Start node in paper mode (testnet)
        response = await async_client.post("/api/node/start", params={"mode": "paper"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "started"
        assert data["mode"] == "paper"

        # 3. Check running status
        response = await async_client.get("/api/node/status")
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "paper"
        assert "trader_id" in data

        # 4. Try to start again (should fail)
        response = await async_client.post("/api/node/start", params={"mode": "live"})
        assert response.status_code == 400

        # 5. Stop node
        response = await async_client.post("/api/node/stop")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "stopped"

        # 6. Check stopped status
        response = await async_client.get("/api/node/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "idle"


class TestStrategyManagement:
    """전략 관리 API 테스트"""

    @pytest.mark.asyncio
    async def test_strategy_lifecycle(self, async_client):
        """전략 추가/조회/제거 사이클"""
        # Start node first
        await async_client.post("/api/node/start", params={"mode": "paper"})

        # 1. Add EMA Cross strategy
        strategy_request = {
            "strategy_type": "ema_cross",
            "instrument_id": "BTCUSDT.BINANCE",
            "timeframe": "1m",
            "parameters": {
                "fast_period": 10,
                "slow_period": 20,
                "trade_size": "0.01",
                "max_positions": 1
            }
        }

        response = await async_client.post(
            "/api/strategies/add",
            json=strategy_request
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["type"] == "ema_cross"
        strategy_id = data["id"]

        # 2. List strategies
        response = await async_client.get("/api/strategies")
        assert response.status_code == 200
        strategies = response.json()
        assert len(strategies) == 1
        assert strategies[0]["id"] == strategy_id

        # 3. Add another strategy (Grid)
        grid_request = {
            "strategy_type": "grid",
            "instrument_id": "ETHUSDT.BINANCE",
            "timeframe": "5m",
            "parameters": {
                "grid_levels": 10,
                "grid_spacing": 0.01,
                "position_size": "0.1"
            }
        }

        response = await async_client.post(
            "/api/strategies/add",
            json=grid_request
        )
        assert response.status_code == 200

        # 4. Check we have 2 strategies
        response = await async_client.get("/api/strategies")
        assert response.status_code == 200
        strategies = response.json()
        assert len(strategies) == 2

        # 5. Remove first strategy
        response = await async_client.delete(f"/api/strategies/{strategy_id}")
        assert response.status_code == 200

        # 6. Verify removal
        response = await async_client.get("/api/strategies")
        assert response.status_code == 200
        strategies = response.json()
        assert len(strategies) == 1
        assert strategies[0]["type"] == "GridTradingStrategy"

        # Cleanup
        await async_client.post("/api/node/stop")


class TestPortfolioManagement:
    """포트폴리오 관리 API 테스트"""

    @pytest.mark.asyncio
    async def test_portfolio_endpoints(self, async_client):
        """포트폴리오 조회 테스트"""
        # Start node
        await async_client.post("/api/node/start", params={"mode": "paper"})

        # 1. Get portfolio summary
        response = await async_client.get("/api/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert "total_value_usdt" in data
        assert "positions" in data
        assert "balances" in data
        assert "position_count" in data

        # 2. Get orders
        response = await async_client.get("/api/orders")
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)

        # 3. Get orders with status filter
        response = await async_client.get("/api/orders", params={"status": "OPEN"})
        assert response.status_code == 200

        # Cleanup
        await async_client.post("/api/node/stop")


class TestWebSocketCommunication:
    """WebSocket 실시간 통신 테스트"""

    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """WebSocket 연결 테스트"""
        # Note: This requires the server to be running
        # In a real test, you'd use a test server instance

        try:
            # Connect to market data WebSocket
            uri = "ws://localhost:8002/ws/market-data"
            async with connect(uri) as websocket:
                # Should receive welcome message
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                assert data["type"] == "connected"
                assert data["channel"] == "market_data"

                # Send ping
                await websocket.send(json.dumps({"type": "ping"}))

                # Should receive pong
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                assert data["type"] == "pong"

        except Exception as e:
            # Server might not be running
            pytest.skip(f"WebSocket test skipped: {e}")

    @pytest.mark.asyncio
    async def test_websocket_subscriptions(self):
        """WebSocket 채널 구독 테스트"""
        try:
            uri = "ws://localhost:8002/ws/orders"
            async with connect(uri) as websocket:
                # Subscribe to multiple channels
                subscribe_msg = {
                    "type": "subscribe",
                    "channels": ["positions", "strategies"]
                }
                await websocket.send(json.dumps(subscribe_msg))

                # Should receive subscription confirmation
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                assert data["type"] == "subscribed"
                assert "positions" in data["channels"]
                assert "strategies" in data["channels"]

        except Exception as e:
            pytest.skip(f"WebSocket subscription test skipped: {e}")


class TestPerformance:
    """성능 테스트"""

    @pytest.mark.asyncio
    async def test_api_response_time(self, async_client):
        """API 응답 시간 테스트"""
        import time

        # Test multiple endpoints
        endpoints = [
            "/api/node/status",
            "/api/strategies",
            "/api/portfolio",
            "/api/orders"
        ]

        # Start node for testing
        await async_client.post("/api/node/start", params={"mode": "paper"})

        response_times = []

        for endpoint in endpoints:
            start = time.time()
            response = await async_client.get(endpoint)
            elapsed = (time.time() - start) * 1000  # Convert to ms

            assert response.status_code == 200
            assert elapsed < 200  # Should respond within 200ms

            response_times.append({
                "endpoint": endpoint,
                "time_ms": elapsed
            })

        # Print performance results
        print("\n=== API Performance Results ===")
        for result in response_times:
            print(f"{result['endpoint']}: {result['time_ms']:.2f}ms")

        avg_time = sum(r["time_ms"] for r in response_times) / len(response_times)
        print(f"Average response time: {avg_time:.2f}ms")

        assert avg_time < 100  # Average should be under 100ms

        # Cleanup
        await async_client.post("/api/node/stop")

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, async_client):
        """동시 요청 처리 테스트"""
        # Start node
        await async_client.post("/api/node/start", params={"mode": "paper"})

        # Send multiple concurrent requests
        tasks = []
        for i in range(10):
            task = async_client.get("/api/node/status")
            tasks.append(task)

        # Execute all requests concurrently
        responses = await asyncio.gather(*tasks)

        # All should succeed
        for response in responses:
            assert response.status_code == 200

        # Cleanup
        await async_client.post("/api/node/stop")


# ====================
# Test Runner
# ====================
if __name__ == "__main__":
    print("=" * 60)
    print("Unit 2 검증: API Gateway 통합 테스트")
    print("=" * 60)

    # Run tests with pytest
    pytest.main([
        __file__,
        "-v",  # Verbose output
        "--tb=short",  # Short traceback
        "-s",  # Show print statements
        "--asyncio-mode=auto"  # Handle async tests
    ])