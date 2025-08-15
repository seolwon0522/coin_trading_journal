# GPT 실제 호출로 전환 가이드

## OpenAI 크레딧 충전 후 수행할 작업

### 1. Mock 응답 비활성화

파일: `trading-engine/app/llm_analyzer.py`
변경 위치: 72번째 줄

```python
# 변경 전
if True:  # 임시로 항상 Mock 응답 사용

# 변경 후
if False:  # Mock 비활성화, 실제 GPT 호출 사용
```

### 2. 변경사항 적용

```bash
# 서버 재시작 (자동 reload되지만 확실히 하려면)
pkill -f 'uvicorn main:app'
source .venv/bin/activate
cd trading-engine/app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 실제 GPT 분석 테스트

```bash
curl -X POST http://localhost:8000/patterns/weekly/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "11111111-1111-1111-1111-111111111111",
    "start": "2024-01-01",
    "end": "2024-01-07"
  }'
```

## OpenAI 대시보드 확인 방법

1. https://platform.openai.com/usage 접속
2. 현재 크레딧 잔액 확인
3. Settings > Billing에서 결제 방법 등록
4. Add credits로 $5-10 충전

## 참고사항

- GPT-4o mini는 매우 저렴 (1M 토큰당 $0.15)
- 한 번 분석당 약 $0.001-0.01 정도 비용
- $5면 수백 번 분석 가능
