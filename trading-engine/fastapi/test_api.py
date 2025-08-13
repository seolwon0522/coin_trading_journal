"""
FastAPI 테스트 스크립트
코인 트레이딩 API의 각 엔드포인트를 테스트
"""

import requests
import json
from datetime import datetime, timedelta

# API 기본 URL
BASE_URL = "http://localhost:8000"

def test_root_endpoint():
    """루트 엔드포인트 테스트"""
    print("=== 루트 엔드포인트 테스트 ===")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"상태 코드: {response.status_code}")
        print(f"응답: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"오류: {e}")
        return False

def test_health_endpoint():
    """헬스 체크 엔드포인트 테스트"""
    print("\n=== 헬스 체크 엔드포인트 테스트 ===")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"상태 코드: {response.status_code}")
        print(f"응답: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"오류: {e}")
        return False

def test_status_endpoint():
    """상태 조회 엔드포인트 테스트"""
    print("\n=== 상태 조회 엔드포인트 테스트 ===")
    try:
        response = requests.get(f"{BASE_URL}/api/v1/status")
        print(f"상태 코드: {response.status_code}")
        print(f"응답: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"오류: {e}")
        return False

def test_score_endpoint():
    """점수 계산 엔드포인트 테스트"""
    print("\n=== 점수 계산 엔드포인트 테스트 ===")
    
    # 테스트용 캔들 데이터 생성
    candles = []
    base_timestamp = int(datetime.now().timestamp() * 1000)
    base_price = 50000.0
    
    for i in range(100):
        timestamp = base_timestamp - (100 - i) * 5 * 60 * 1000  # 5분 간격
        price_change = (i - 50) * 0.001  # -5% ~ +5% 변동
        price = base_price * (1 + price_change)
        
        candle = {
            "timestamp": timestamp,
            "open": price * 0.999,
            "high": price * 1.002,
            "low": price * 0.998,
            "close": price,
            "volume": 1000.0 + i * 10,
            "symbol": "BTC/USDT",
            "timeframe": "5m"
        }
        candles.append(candle)
    
    # 점수 계산 요청 데이터
    request_data = {
        "symbol": "BTC/USDT",
        "timeframe": "5m",
        "candles": candles,
        "strategy_name": "BreakoutStrategy",
        "parameters": {
            "lookback_period": 20,
            "breakout_threshold": 2,
            "volume_threshold": 500
        },
        "include_indicators": True,
        "include_signals": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/score",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"점수: {result.get('score', 'N/A')}")
            print(f"신호: {result.get('signal', 'N/A')}")
            print(f"신뢰도: {result.get('confidence', 'N/A')}")
            print(f"근거: {result.get('reasoning', 'N/A')}")
            if result.get('indicators'):
                print(f"지표값: {result['indicators']}")
        else:
            print(f"오류 응답: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"오류: {e}")
        return False

def test_trade_score_endpoint():
    """거래 점수 계산 엔드포인트 테스트"""
    print("\n=== 거래 점수 계산 엔드포인트 테스트 ===")
    
    # 테스트용 거래 정보
    trade_info = {
        "pair": "BTC/USDT",
        "side": "buy",
        "amount": 0.001,
        "price": 50000.0,
        "timestamp": datetime.now().isoformat(),
        "strategy": "BreakoutStrategy",
        "confidence": 0.85,
        "stop_loss": 45000.0,
        "take_profit": 55000.0,
        "metadata": {
            "rsi": 65.5,
            "volume_ratio": 1.2,
            "breakout_level": 51000.0
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/trade/score",
            json=trade_info,
            headers={"Content-Type": "application/json"}
        )
        print(f"상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"점수: {result.get('total_score', 'N/A')}")
            print(f"신호: {result.get('signal', 'N/A')}")
            print(f"신뢰도: {result.get('confidence', 'N/A')}")
        else:
            print(f"오류 응답: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"오류: {e}")
        return False

def main():
    """모든 테스트 실행"""
    print("FastAPI 코인 트레이딩 시스템 테스트 시작")
    print("=" * 50)
    
    tests = [
        ("루트 엔드포인트", test_root_endpoint),
        ("헬스 체크", test_health_endpoint),
        ("상태 조회", test_status_endpoint),
        ("점수 계산", test_score_endpoint),
        ("거래 점수 계산", test_trade_score_endpoint)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
            print(f"✅ {test_name}: {'성공' if success else '실패'}")
        except Exception as e:
            print(f"❌ {test_name}: 오류 발생 - {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("테스트 결과 요약:")
    for test_name, success in results:
        status = "✅ 성공" if success else "❌ 실패"
        print(f"{test_name}: {status}")
    
    success_count = sum(1 for _, success in results if success)
    total_count = len(results)
    print(f"\n전체: {success_count}/{total_count} 성공")

if __name__ == "__main__":
    main() 