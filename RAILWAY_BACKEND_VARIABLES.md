# Railway Backend 환경 변수 설정

## 🎯 Railway Dashboard에서 Backend 서비스에 설정할 변수들

Railway PostgreSQL 서비스의 실제 변수명에 맞춰 Backend 서비스의 Variables 탭에서 다음 변수들을 설정하세요.

### ✅ 필수 설정 변수 (복사해서 사용)

```bash
# ========================================
# 1. Spring Boot 프로파일 설정 (필수)
# ========================================
SPRING_PROFILES_ACTIVE=railway

# ========================================
# 2. 데이터베이스 연결 (Railway PostgreSQL 참조)
# ========================================
# 옵션 A: DATABASE_URL 사용 (권장) ✅
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 옵션 B: 개별 변수 참조 (DATABASE_URL 대신 사용)
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}

# ========================================
# 3. 보안 키 설정 (필수 - 프로덕션용 보안 키)
# ========================================
JWT_SECRET=LbUiGeQhj4mQWfKtl9SzSf4O5hB3ewHoqckB6o0owJcLnZKGPGxzo98zcUWzWVafXoCQWVq26PcKQiB2g
CRYPTO_SECRET_KEY=8pTUVbSP5kSmtWuR4YoDOAwxoivNcZhzERUfHl4iVNY=

# ========================================
# 4. Google OAuth2 설정 (필수)
# ========================================
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# ========================================
# 5. CORS 설정 (필수)
# ========================================
CORS_ALLOWED_ORIGINS=https://autotradings.vercel.app,http://localhost:3000

# ========================================
# 6. Binance API 설정 (선택 - 실제 API 키로 변경 필요)
# ========================================
BINANCE_API_KEY=your_testnet_api_key_here
BINANCE_SECRET_KEY=your_testnet_secret_key_here
USE_BINANCE_TESTNET=true

# ========================================
# 7. 시스템 설정 (선택)
# ========================================
TZ=Asia/Seoul
PORT=8080
```

## ⚠️ 중요 사항

### 1. PostgreSQL 서비스 이름 확인
- Railway에서 PostgreSQL 서비스 이름이 `PostgreSQL`이 아닌 경우:
  - 예: 서비스 이름이 `Postgres`인 경우 → `${{Postgres.DATABASE_URL}}`
  - 예: 서비스 이름이 `Database`인 경우 → `${{Database.DATABASE_URL}}`

### 2. 변수 참조 문법
- **올바른 형식**: `${{ServiceName.VARIABLE}}`
- **잘못된 형식**: `${ServiceName.VARIABLE}` (중괄호 하나만 사용 X)

### 3. 하드코딩된 값 제거
- 기존 GitHub Backend Variables에 있던 하드코딩된 DB 정보는 모두 제거
- Railway PostgreSQL 참조로 대체

## 🔍 설정 확인 방법

### Railway Dashboard에서 확인
1. Backend 서비스 → Variables 탭
2. 변수 값이 `${{PostgreSQL.DATABASE_URL}}` 형태로 표시되는지 확인
3. Deploy 탭에서 로그 확인

### 로그에서 확인할 메시지
```
✅ Database connection successful!
  - Type: Railway Internal Connection (Optimized)
  - Product: PostgreSQL 15.x
  - URL: postgresql://***:***@xxx.railway.internal:5432/railway
```

## ❌ 제거해야 할 기존 변수들

다음 하드코딩된 변수들은 제거하세요:
```bash
# 이것들은 제거하세요 (하드코딩된 외부 DB 정보)
PGHOST="hopper.proxy.rlwy.net"  # ❌ 제거
PGPORT="18325"                   # ❌ 제거
PGPASSWORD="NcMEfkyvnoPLpOTZyiVxFMUHomUhpUZN"  # ❌ 제거
```

## 📋 체크리스트

- [ ] PostgreSQL 서비스가 Railway에 생성되어 있는지 확인
- [ ] PostgreSQL 서비스 이름 확인 (보통 `PostgreSQL` 또는 `Postgres`)
- [ ] Backend 서비스에서 기존 하드코딩된 DB 변수 제거
- [ ] 새로운 변수 참조 형식으로 설정 (`${{PostgreSQL.XXX}}`)
- [ ] `SPRING_PROFILES_ACTIVE=railway` 설정 확인
- [ ] 배포 후 로그에서 연결 성공 메시지 확인