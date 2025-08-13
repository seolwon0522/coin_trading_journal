# 주간 패턴 분석 기능 설정 가이드

## 환경 변수 설정

다음 환경 변수들을 설정해야 합니다:

```bash
# 데이터베이스 연결 (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/trading_journal

# OpenAI API 키
OPENAI_API_KEY=your_openai_api_key_here

# 기타 설정
LOG_LEVEL=INFO
```

## 데이터베이스 테이블

서버 시작 시 자동으로 다음 테이블들이 생성됩니다:

### patterns_summary_weekly

- 주간 분석 요약 저장
- GPT 응답 전체를 JSONB로 저장

### pattern_history

- 개별 패턴 히스토리 저장
- 손실/수익 패턴을 분리하여 저장

## API 엔드포인트

### POST /patterns/weekly/analyze

주간 패턴 분석 수행

**요청:**

```json
{
  "user_id": "user-uuid",
  "start": "2024-01-01",
  "end": "2024-01-07"
}
```

**응답:**

```json
{
  "success": true,
  "summary_id": 123,
  "analysis": {
    "improvements": ["승률이 10% 향상됨", "..."],
    "top_loss_pattern": {
      "title": "오후 시간대 과매매",
      "why": "15-17시 거래에서 평균 -2.3% 손실",
      "actions": ["오후 거래 빈도 줄이기", "...]
    },
    "top_profit_pattern": {
      "title": "아침 돌파 전략",
      "why": "09-11시 돌파 거래 승률 85%",
      "actions": ["아침 시간대 집중", "..."]
    }
  },
  "message": "주간 패턴 분석이 완료되었습니다."
}
```

### GET /patterns/history

패턴 히스토리 조회

**쿼리 파라미터:**

- `user_id`: 사용자 ID (필수)
- `pattern_type`: 'loss' 또는 'profit' (선택)
- `limit`: 조회할 개수 (기본: 10)

### GET /patterns/weekly/{summary_id}

특정 주간 분석 결과 조회

## 사용 방법

1. 의존성 설치:

```bash
pip install -r requirements.txt
```

2. 환경 변수 설정 후 서버 시작:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. API 호출하여 주간 분석 수행

## 주의사항

- OpenAI API 키가 필요합니다
- PostgreSQL 데이터베이스 연결이 필요합니다
- trades 테이블에 거래 데이터가 있어야 분석이 가능합니다
- 동일 기간에 대한 분석은 중복 수행되지 않습니다 (캐시 기능)
