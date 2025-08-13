# 코인 트레이딩 시스템

Kafka와 FreqTrade를 연동한 코인 트레이딩 시스템입니다.

## 🚀 빠른 시작

### 1. FastAPI 서버 실행

```bash
# FastAPI 디렉토리로 이동
cd fastapi

# 서버 실행
python main.py
```

### 2. 데이터베이스 설정

`DATABASE_URL` 환경 변수를 통해 PostgreSQL 연결을 설정합니다. 기본값은 `postgresql://localhost:5432/trading_journal` 입니다. 서버 시작 시 필요한 테이블이 자동으로 생성됩니다.

### 3. 테스트 실행

```bash
pytest fastapi/tests
```

### 2. Swagger UI 접속

서버가 실행되면 다음 주소로 접속하세요:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc 문서**: http://localhost:8000/redoc

### 3. API 테스트

#### 기본 테스트

```bash
# 브라우저에서 접속
http://localhost:8000/test
```

#### 헬스 체크

```bash
# 브라우저에서 접속
http://localhost:8000/health
```

## 📋 API 엔드포인트

### 1. 거래 점수 계산 (`POST /api/v1/trade/score`)

거래 정보를 받아서 점수를 계산하는 엔드포인트입니다.

**요청 예시:**

```json
{
  "pair": "BTC/USDT",
  "side": "buy",
  "amount": 0.001,
  "price": 50000.0,
  "timestamp": "2024-01-15T12:00:00Z",
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
```

### 2. 일반 점수 계산 (`POST /score`)

캔들 데이터를 직접 제공하여 점수를 계산하는 엔드포인트입니다.

**요청 예시:**

```json
{
  "symbol": "BTC/USDT",
  "timeframe": "5m",
  "candles": [
    {
      "timestamp": 1640995200000,
      "open": 50000.0,
      "high": 51000.0,
      "low": 49000.0,
      "close": 50500.0,
      "volume": 1000.5,
      "symbol": "BTC/USDT",
      "timeframe": "5m"
    }
  ],
  "strategy_name": "BreakoutStrategy",
  "parameters": {
    "lookback_period": 20,
    "breakout_threshold": 2,
    "volume_threshold": 500
  },
  "include_indicators": true,
  "include_signals": true
}
```

## 🔧 문제 해결

### 무한 로딩 문제

만약 API 요청 시 무한 로딩이 발생한다면:

1. **서버 로그 확인**: 터미널에서 서버 로그를 확인하여 어느 단계에서 멈추는지 확인
2. **기본 테스트**: `/test` 엔드포인트가 정상 작동하는지 확인
3. **데이터 형식**: 요청 데이터의 형식이 올바른지 확인

### Kafka 연결 오류

현재 Kafka 연결 오류가 발생하지만, 점수 계산 기능은 정상 작동합니다:

```
ERROR:aiokafka:Unable connect to "kafka:9092"
```

이는 정상적인 상황이며, Kafka 없이도 API 기능을 사용할 수 있습니다.

## 📁 프로젝트 구조

```
coin_trading/
├── app/                    # 기본 FastAPI 앱
├── fastapi/               # 메인 FastAPI 서버
│   ├── main.py           # 메인 애플리케이션
│   ├── models.py         # 데이터 모델
│   ├── scorer.py         # 점수 계산 로직
│   └── test_api.py       # API 테스트
├── freqtrade_config/      # FreqTrade 설정
└── requirements.txt       # 의존성 목록
```

## 🛠️ 개발 환경 설정

### 필요한 패키지 설치

```bash
# FastAPI 디렉토리에서
pip install -r requirements.txt
```

### 주요 의존성

- FastAPI
- uvicorn
- pandas
- numpy
- aiokafka (선택사항)

## 📊 점수 계산 지표

시스템은 다음 지표들을 종합하여 점수를 계산합니다:

- **볼린저 밴드**: 가격이 상단 밴드를 돌파하는 정도
- **RSI**: 상대강도지수 (30~70이 적정)
- **거래량**: 거래량 증가율
- **이동평균**: 가격과 이동평균선의 관계
- **모멘텀**: 가격 변화율
- **돌파 레벨**: 주요 저항/지지선 돌파
- **변동성**: 가격 변동성
- **트렌드**: 전체적인 가격 추세

## 🎯 응답 형식

### 성공 응답 예시

```json
{
  "status": "success",
  "symbol": "BTC/USDT",
  "timestamp": "2024-01-15T12:00:00Z",
  "total_score": 0.75,
  "signal": "buy",
  "confidence": 0.85,
  "indicators": {
    "rsi": 65.5,
    "bb_upper": 51000.0,
    "bb_lower": 49000.0,
    "sma_20": 50200.0,
    "volume_ratio": 1.2
  },
  "reasoning": "볼린저 밴드 상단 돌파, RSI 65.5로 적정 수준, 거래량 20% 증가",
  "trade_info": {
    "pair": "BTC/USDT",
    "side": "buy",
    "amount": 0.001,
    "price": 50000.0
  },
  "processed_at": "2024-01-15T12:00:00Z",
  "sub_scores": {
    "bollinger_score": 0.8,
    "rsi_score": 0.6,
    "volume_score": 0.7
  }
}
```

## 🔍 디버깅

### 로그 확인

서버 실행 시 다음과 같은 로그를 확인할 수 있습니다:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
INFO:main:거래 점수 계산 요청: BTC/USDT
INFO:main:캔들 데이터 가져오기 완료: 100개
INFO:main:점수 계산 완료
INFO:main:응답 전송: BTC/USDT, 점수: 0.75
```

### 오류 해결

1. **422 Unprocessable Content**: 요청 데이터 형식이 잘못됨
2. **500 Internal Server Error**: 서버 내부 오류
3. **무한 로딩**: 점수 계산 과정에서 오류 발생

## 📞 지원

문제가 발생하면 서버 로그를 확인하고, 필요한 경우 이슈를 등록해주세요.
