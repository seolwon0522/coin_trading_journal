# 아키텍처 일관성 개선 내역

## 주요 변경사항

### 1. 데이터 타입 정밀도 개선
- **변경**: 프론트엔드에 `decimal.js` 라이브러리 도입
- **이유**: 백엔드 `BigDecimal`과 동일한 정밀도 보장
- **영향**: 금융 데이터 계산 정확도 향상

### 2. ID 타입 통일
- **변경**: 프론트엔드 Trade ID를 `string` → `number`로 변경
- **이유**: 백엔드 `Long` 타입과 일치
- **영향**: 불필요한 타입 변환 제거

### 3. API 응답 구조 통일
- **변경**: `ApiResponse` 래퍼 타입 추가
- **이유**: 백엔드 응답 구조와 일치
- **영향**: 일관된 에러 처리 가능

### 4. 필드명 통일
- **memo** → **notes**
- **pnl** → **profitLoss**
- **pnlPercentage** → **profitLossPercentage**

## 파일 변경 목록

### 프론트엔드
- `src/types/trade.ts` - Trade 타입 정의 수정
- `src/types/api-response.ts` - ApiResponse 타입 추가 (신규)
- `src/lib/api/trade-mapper.ts` - 데이터 변환 로직 개선
- `src/lib/api/trades-api.ts` - API 클라이언트 수정

### 백엔드
- 변경 없음 (프론트엔드를 백엔드에 맞춤)

## 남은 작업 (선택적)
- 컴포넌트에서 Decimal 타입 처리 (필요시)
- executedAt/entryTime 필드 정리 (혼란 방지용)