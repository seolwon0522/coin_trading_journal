"""
Unit 2 간단한 검증 테스트 - NautilusTrader 의존성 없이 테스트
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.api.main import app
from app.strategies.factory import StrategyFactory
from app.websocket.manager import WebSocketManager
import json


def test_health_check():
    """헬스 체크 엔드포인트 테스트"""
    print("\n1. Health Check Test...")

    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Nautilus Trading API"
    assert data["status"] == "healthy"

    print("   ✅ Health check passed!")
    print(f"   Response: {json.dumps(data, indent=2)}")
    return True


def test_node_status():
    """노드 상태 조회 테스트"""
    print("\n2. Node Status Test...")

    client = TestClient(app)
    response = client.get("/api/node/status")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "idle"
    assert data["is_running"] == False

    print("   ✅ Node status check passed!")
    print(f"   Response: {json.dumps(data, indent=2)}")
    return True


def test_strategy_factory():
    """전략 팩토리 테스트"""
    print("\n3. Strategy Factory Test...")

    # Test default parameters
    defaults = StrategyFactory.get_default_parameters("ema_cross")
    assert "fast_period" in defaults
    assert "slow_period" in defaults
    assert defaults["fast_period"] == 10
    assert defaults["slow_period"] == 20

    print("   ✅ EMA Cross default parameters OK!")

    # Test strategy list
    strategies = StrategyFactory.list_available_strategies()
    assert "ema_cross" in strategies
    assert "grid" in strategies
    assert "rsi" in strategies

    print(f"   ✅ Found {len(strategies)} available strategies!")

    for name, info in strategies.items():
        print(f"      - {name}: {info['description']}")

    return True


def test_websocket_manager():
    """WebSocket 매니저 기본 테스트"""
    print("\n4. WebSocket Manager Test...")

    manager = WebSocketManager()

    # Get initial stats
    stats = manager.get_stats()
    assert stats["active_connections"] == 0
    assert "channels" in stats

    print("   ✅ WebSocket manager initialized!")
    print(f"   Channels: {list(stats['channels'].keys())}")

    return True


def test_api_models():
    """API 모델 테스트"""
    print("\n5. API Models Test...")

    from app.api.models import (
        NodeMode, StrategyType, TimeFrame,
        NodeStartRequest, StrategyAddRequest
    )

    # Test enums
    assert NodeMode.LIVE == "live"
    assert NodeMode.BACKTEST == "backtest"
    assert NodeMode.PAPER == "paper"

    print("   ✅ Node modes OK!")

    # Test strategy types
    assert StrategyType.EMA_CROSS == "ema_cross"
    assert StrategyType.GRID == "grid"

    print("   ✅ Strategy types OK!")

    # Test request models
    node_req = NodeStartRequest(mode=NodeMode.PAPER)
    assert node_req.mode == NodeMode.PAPER

    strategy_req = StrategyAddRequest(
        strategy_type=StrategyType.EMA_CROSS,
        instrument_id="BTCUSDT.BINANCE",
        timeframe=TimeFrame.ONE_MIN,
        parameters={"fast_period": 10}
    )
    assert strategy_req.strategy_type == StrategyType.EMA_CROSS

    print("   ✅ Request models OK!")

    return True


def run_tests():
    """모든 테스트 실행"""
    print("="*60)
    print("Unit 2 간단한 검증 테스트 시작")
    print("="*60)

    tests = [
        ("Health Check", test_health_check),
        ("Node Status", test_node_status),
        ("Strategy Factory", test_strategy_factory),
        ("WebSocket Manager", test_websocket_manager),
        ("API Models", test_api_models)
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            failed += 1
            print(f"   ❌ {name} failed: {e}")

    print("\n" + "="*60)
    print(f"테스트 결과: {passed} passed, {failed} failed")

    if failed == 0:
        print("✅ 모든 테스트 통과! Unit 2 기본 구조 검증 완료!")
    else:
        print(f"⚠️ {failed}개 테스트 실패. 수정이 필요합니다.")

    print("="*60)

    return failed == 0


if __name__ == "__main__":
    success = run_tests()

    if success:
        print("\n🎉 Unit 2 검증 성공!")
        print("다음 단계로 진행 가능합니다.")
    else:
        print("\n⚠️ 테스트 실패. 코드 확인이 필요합니다.")
        sys.exit(1)