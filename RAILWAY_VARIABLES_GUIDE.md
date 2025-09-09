# Railway PostgreSQL 연동 가이드

## 📋 개요

Railway에서 자동 생성된 PostgreSQL 서비스를 Backend와 연동하는 완벽 가이드입니다.

## 🎯 Railway PostgreSQL 사용 방법

### Step 1: Railway에서 PostgreSQL 서비스 생성

1. Railway Dashboard에서 "New Service" 클릭
2. "Database" → "Add PostgreSQL" 선택
3. PostgreSQL 서비스가 자동으로 생성되고 환경 변수 할당됨

### Step 2: PostgreSQL 서비스 변수 확인

Railway PostgreSQL 서비스는 다음 환경 변수를 자동으로 생성합니다:

```bash
# Railway PostgreSQL 서비스가 제공하는 실제 변수들
DATABASE_URL="postgresql://${PGUSER}:${POSTGRES_PASSWORD}@${RAILWAY_PRIVATE_DOMAIN}:5432/${PGDATABASE}"
DATABASE_PUBLIC_URL="postgresql://${PGUSER}:${POSTGRES_PASSWORD}@${RAILWAY_TCP_PROXY_DOMAIN}:${RAILWAY_TCP_PROXY_PORT}/${PGDATABASE}"
PGDATABASE="${POSTGRES_DB}"         # railway
PGHOST="${RAILWAY_PRIVATE_DOMAIN}"  # 내부 도메인 (*.railway.internal)
PGPASSWORD="${POSTGRES_PASSWORD}"   # 자동 생성된 비밀번호
PGPORT="5432"                        # 내부 포트
PGUSER="${POSTGRES_USER}"           # postgres
POSTGRES_DB="railway"                # 데이터베이스 이름
POSTGRES_PASSWORD="xxxxx"            # 자동 생성된 비밀번호
POSTGRES_USER="postgres"             # 사용자 이름
```

## 🚀 Backend 서비스 환경 변수 설정

### 중요: Backend 서비스에서 PostgreSQL 변수 참조하기

Railway Backend 서비스의 Variables 탭에서 다음과 같이 설정:

```bash
# ⚠️ 중요: PostgreSQL 서비스의 변수를 참조하는 방법
# ${{Postgres.변수명}} 형식 사용 (Postgres는 서비스 이름)

# 1. 프로파일 설정 (필수)
SPRING_PROFILES_ACTIVE=railway

# 2. 데이터베이스 연결 - Railway PostgreSQL 참조
# 방법 1: DATABASE_URL 사용 (권장) ✅
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 방법 2: 개별 변수 참조 (대안)
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGDATABASE=${{Postgres.PGDATABASE}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}

# 3. JWT 설정
JWT_SECRET=your-very-long-secret-key-at-least-256-bits

# 4. 암호화 키
CRYPTO_SECRET_KEY=your-base64-encoded-32-byte-key

# 5. Google OAuth (선택)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# 6. Binance API (선택)
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
USE_BINANCE_TESTNET=true

# 7. CORS 설정
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

# 8. 타임존
TZ=Asia/Seoul
```

## 🔄 환경 변수 참조 방법

Railway에서는 서비스 간 환경 변수를 참조할 수 있습니다:

### Railway Dashboard에서 설정

1. Backend 서비스의 Variables 탭으로 이동
2. "New Variable" 클릭
3. 다음 형식으로 입력:
   - Key: `DATABASE_URL`
   - Value: `${{Postgres.DATABASE_URL}}`

### railway.json에서 설정

```json
{
  "environments": {
    "production": {
      "services": {
        "backend": {
          "variables": {
            "DATABASE_URL": "${{Postgres.DATABASE_URL}}",
            "PGHOST": "${{Postgres.PGHOST}}",
            "PGPORT": "${{Postgres.PGPORT}}",
            "PGDATABASE": "${{Postgres.PGDATABASE}}",
            "PGUSER": "${{Postgres.PGUSER}}",
            "PGPASSWORD": "${{Postgres.PGPASSWORD}}"
          }
        }
      }
    }
  }
}
```

## ⚠️ 주의사항

### 1. 내부 vs 외부 연결

- **내부 연결 (권장)**: Railway 서비스 간 통신
  - 호스트: `*.railway.internal`
  - 포트: `5432`
  - 더 빠르고 안전함

- **외부 연결**: 외부에서 접근 시
  - 호스트: `*.proxy.rlwy.net`
  - 포트: 동적 할당 (예: 18325)
  - 네트워크 오버헤드 발생

### 2. 환경 변수 우선순위

Spring Boot는 다음 순서로 환경 변수를 읽습니다:

1. `DATABASE_URL` (전체 연결 문자열)
2. 개별 `PG*` 변수들
3. application-railway.yaml의 기본값

### 3. 보안 주의사항

- JWT_SECRET과 CRYPTO_SECRET_KEY는 충분히 길고 복잡하게 설정
- 프로덕션에서는 반드시 고유한 값 사용
- 환경 변수에 민감한 정보를 하드코딩하지 않기

## 🧪 연결 테스트

배포 후 다음 엔드포인트로 데이터베이스 연결을 확인할 수 있습니다:

```bash
# Health Check
curl https://your-app.railway.app/actuator/health

# 상세 정보
curl https://your-app.railway.app/actuator/health/db
```

## 📝 트러블슈팅

### 연결 실패 시 확인사항

1. **SPRING_PROFILES_ACTIVE=railway** 설정 확인
2. Railway Dashboard에서 PostgreSQL 서비스 상태 확인
3. 환경 변수 참조 문법 확인 (`${{ServiceName.VARIABLE}}`)
4. 로그 확인:
   ```bash
   railway logs
   ```

### 일반적인 오류 해결

| 오류 | 원인 | 해결 방법 |
|------|------|-----------|
| `Connection refused` | 잘못된 호스트/포트 | DATABASE_URL 사용 또는 내부 도메인 확인 |
| `password authentication failed` | 잘못된 비밀번호 | Railway 변수 참조 확인 |
| `database does not exist` | DB 이름 오류 | PGDATABASE 변수 확인 |
| `SSL required` | SSL 설정 문제 | `?sslmode=require` 추가 |

## 🚀 Best Practices

1. **DATABASE_URL 사용**: 개별 변수보다 DATABASE_URL 사용 권장
2. **내부 연결 사용**: Railway 서비스 간에는 내부 도메인 사용
3. **환경별 분리**: 개발/스테이징/프로덕션 환경 변수 분리
4. **시크릿 관리**: Railway의 시크릿 관리 기능 활용
5. **모니터링**: Health check 엔드포인트로 연결 상태 모니터링