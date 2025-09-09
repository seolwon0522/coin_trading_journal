# Railway 배포 간단 가이드

## Railway Backend 환경 변수 설정

Railway Dashboard의 Backend 서비스 Variables에 아래 변수들을 추가하세요:

```bash
# 1. Spring 프로파일 (필수)
SPRING_PROFILES_ACTIVE=railway

# 2. 데이터베이스 연결 (Railway PostgreSQL 참조) - Spring Boot가 자동으로 파싱
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 3. 보안 키
JWT_SECRET=LbUiGeQhj4mQWfKtl9SzSf4O5hB3ewHoqckB6o0owJcLnZKGPGxzo98zcUWzWVafXoCQWVq26PcKQiB2g
CRYPTO_SECRET_KEY=8pTUVbSP5kSmtWuR4YoDOAwxoivNcZhzERUfHl4iVNY=

# 4. Google OAuth (실제 값으로 변경)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 5. CORS 설정
CORS_ALLOWED_ORIGINS=https://autotradings.vercel.app,http://localhost:3000

# 6. Binance API (선택)
BINANCE_API_KEY=your-api-key
BINANCE_SECRET_KEY=your-secret-key
USE_BINANCE_TESTNET=true

# 7. 기타
TZ=Asia/Seoul
PORT=8080
```

## 중요 사항

1. **따옴표 없이 입력**: Railway Variables에 값을 입력할 때 따옴표를 넣지 마세요
2. **DATABASE_URL만 필요**: Spring Boot가 자동으로 파싱하므로 별도의 DB 변수 불필요
3. **PostgreSQL 서비스 이름 확인**: 보통 `Postgres`이지만 다를 수 있음

## 확인 방법

배포 후 로그 확인:
```bash
railway logs --service=backend
```

정상 연결 시 로그:
```
HikariPool-1 - Starting...
HikariPool-1 - Start completed.
Started TradingBotApplication in X seconds
```

## 끝!

이게 전부입니다. 복잡한 설정 파일이나 추가 코드 없이 Railway가 제공하는 DATABASE_URL을 Spring Boot가 자동으로 사용합니다.