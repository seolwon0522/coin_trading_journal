# 🧪 Frontend-Backend 통합 테스트 가이드

## 📋 변경사항 요약

### ✅ 완료된 작업
1. **Trade 모듈**: 필드명 통일 완료
2. **Statistics 모듈**: 통계 데이터 구조 통일
3. **Market Data 모듈**: 시장 데이터 타입 정의

## 🔄 주요 변경 필드 매핑

### Trade 모듈
| 이전 (Frontend) | 현재 (Frontend) | Backend | 설명 |
|----------------|----------------|---------|------|
| type: 'buy'\|'sell' | side: 'BUY'\|'SELL' | TradeSide | 매수/매도 |
| - | type: 'SPOT'\|'FUTURES'\|'MARGIN' | TradeType | 거래 타입 |
| tradingType | tradingStrategy | TradingStrategy | 전략 타입 |

### 새로 추가된 파일
- `backend/src/.../TradingStrategy.java` - 전략 타입 enum
- `frontend/src/types/statistics.ts` - 통계 타입 정의
- `frontend/src/types/market.ts` - 시장 데이터 타입
- `frontend/src/lib/api/trade-mapper.ts` - Trade 매핑 함수
- `frontend/src/lib/api/statistics-mapper.ts` - Statistics 매핑 함수
- `frontend/src/lib/api/market-mapper.ts` - Market 매핑 함수

## 🚀 테스트 실행 방법

### 1. Backend 테스트

```bash
cd backend

# 데이터베이스 마이그레이션 실행
./gradlew flywayMigrate

# 컴파일 및 테스트
./gradlew clean build test

# 애플리케이션 실행
./gradlew bootRun
```

### 2. Frontend 테스트

```bash
cd frontend

# 의존성 설치
npm install

# TypeScript 타입 체크
npm run type-check

# 개발 서버 실행
npm run dev

# 테스트 실행
npm test
```

### 3. Docker Compose 통합 테스트

```bash
# 전체 시스템 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 상태 확인
docker-compose ps
```

## 📝 API 테스트 시나리오

### 시나리오 1: Trade 생성 테스트

```bash
# 새 거래 생성
curl -X POST http://localhost:8080/api/trades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "symbol": "BTCUSDT",
    "type": "SPOT",
    "side": "BUY",
    "tradingStrategy": "BREAKOUT",
    "quantity": "0.001",
    "price": "50000.00",
    "entryTime": "2024-01-20T10:00:00Z",
    "notes": "테스트 거래"
  }'
```

### 시나리오 2: Statistics 조회 테스트

```bash
# 통계 조회
curl -X GET "http://localhost:8080/api/trades/statistics?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 시나리오 3: Frontend 컴포넌트 테스트

1. http://localhost:3000 접속
2. 로그인
3. Trades 페이지에서 새 거래 추가
4. 필드 확인:
   - Side: BUY/SELL 선택
   - Type: SPOT/FUTURES/MARGIN 선택
   - Trading Strategy: BREAKOUT/TREND 등 선택
5. 저장 후 목록에서 확인

## ✅ 검증 체크리스트

### Backend
- [ ] TradingStrategy enum이 정상 작동
- [ ] Trade Entity에 새 필드 저장됨
- [ ] TradeResponse DTO가 올바른 데이터 반환
- [ ] Database Migration 성공
- [ ] API 엔드포인트 정상 응답

### Frontend
- [ ] TypeScript 컴파일 에러 없음
- [ ] Trade 타입의 새 필드 사용 가능
- [ ] API 매핑 함수 정상 작동
- [ ] UI 컴포넌트에서 새 필드 표시
- [ ] 드롭다운 옵션 정상 표시

### 통합
- [ ] Frontend → Backend API 호출 성공
- [ ] 데이터 저장 및 조회 정상
- [ ] 변환 함수 정상 작동
- [ ] 레거시 데이터 호환성

## 🐛 알려진 이슈 및 해결방법

### 이슈 1: TypeScript 컴파일 에러
**증상**: `Type 'string' is not assignable to type 'BUY' | 'SELL'`
**해결**: trade-mapper.ts의 매핑 함수 확인

### 이슈 2: Database 마이그레이션 실패
**증상**: `Column 'trading_strategy' doesn't exist`
**해결**: 
```bash
./gradlew flywayClean
./gradlew flywayMigrate
```

### 이슈 3: API 응답 필드 누락
**증상**: Frontend에서 undefined 값
**해결**: Backend DTO의 @JsonProperty 확인

## 📊 성능 테스트

```bash
# API 응답 시간 테스트
curl -w "\n\nTotal time: %{time_total}s\n" \
  http://localhost:8080/api/trades

# 예상 결과
# - Trade 목록 조회: < 200ms
# - Statistics 계산: < 500ms
# - Market Data 조회: < 100ms
```

## 🔄 롤백 계획

문제 발생 시:
1. Git에서 이전 커밋으로 복구
2. Database 롤백: `./gradlew flywayUndo`
3. Docker 컨테이너 재시작

## 📚 참고 문서
- [Trade 모듈 변경사항](./docs/trade-module-changes.md)
- [API 명세서](./openapi.yaml)
- [Database 스키마](./backend/src/main/resources/db/migration/)

---

테스트 완료 후 이슈가 있으면 보고해주세요!