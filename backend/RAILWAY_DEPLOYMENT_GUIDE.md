# Railway 배포 가이드

## 1. Railway 프로젝트 생성

1. [Railway](https://railway.app) 계정 생성 및 로그인
2. 새 프로젝트 생성 (New Project → Deploy from GitHub repo)
3. GitHub 리포지토리 연결 및 `backend` 디렉토리 선택

## 2. PostgreSQL 데이터베이스 추가

1. Railway 프로젝트 대시보드에서 `New` → `Database` → `PostgreSQL` 선택
2. PostgreSQL 인스턴스가 자동으로 생성됨
3. `Variables` 탭에서 `DATABASE_URL` 확인 (자동 연결됨)

## 3. 필수 환경 변수 설정

Railway 프로젝트의 `Variables` 탭에서 다음 환경 변수를 추가:

### 필수 환경 변수

```bash
# Spring Profile (자동 설정됨)
SPRING_PROFILES_ACTIVE=railway

# 포트 (Railway가 자동 할당)
PORT=8080

# JWT 설정 (보안을 위해 강력한 키 사용)
JWT_SECRET=your-very-long-and-secure-jwt-secret-key-minimum-512-bits

# 암호화 키 (API 키 암호화용, base64 인코딩된 32바이트 키)
CRYPTO_SECRET_KEY=your-base64-encoded-32-byte-key

# Google OAuth2 (구글 클라우드 콘솔에서 발급)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# CORS 설정 (Vercel 프론트엔드 URL)
CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,https://your-custom-domain.com

# Binance API (선택사항 - 테스트넷 사용 시 비워둬도 됨)
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
USE_BINANCE_TESTNET=true  # 테스트넷 사용 여부
```

### 환경 변수 생성 방법

#### JWT Secret 생성
```bash
# Linux/Mac
openssl rand -base64 64

# Windows (PowerShell)
[System.Convert]::ToBase64String((1..64 | ForEach-Object {Get-Random -Maximum 256}))
```

#### Crypto Secret Key 생성
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[System.Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

## 4. 배포 설정

### railway.toml 파일 확인
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "./Dockerfile"

[deploy]
startCommand = "java -Dspring.profiles.active=railway -jar app.jar"
healthcheckPath = "/actuator/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

## 5. 배포 실행

### GitHub 연동 배포 (권장)
1. GitHub 리포지토리에 코드 푸시
2. Railway가 자동으로 빌드 및 배포 시작
3. 배포 로그 모니터링

### Railway CLI 사용 (대안)
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 배포
railway up
```

## 6. 배포 확인

1. Railway 대시보드에서 배포 상태 확인
2. 생성된 도메인으로 헬스체크: `https://your-app.up.railway.app/actuator/health`
3. Swagger UI 확인: `https://your-app.up.railway.app/swagger-ui/index.html`

## 7. 프론트엔드 연결

Vercel에 배포된 프론트엔드의 환경 변수 업데이트:

```bash
# Vercel 환경 변수
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

## 8. 트러블슈팅

### 빌드 실패
- Gradle wrapper 권한 확인
- Java 17 버전 확인
- `settings.gradle` 파일 존재 확인

### 데이터베이스 연결 실패
- `DATABASE_URL` 형식 확인
- PostgreSQL 서비스 상태 확인
- 네트워크 보안 그룹 설정 확인

### CORS 에러
- `CORS_ALLOWED_ORIGINS` 환경 변수에 프론트엔드 URL 포함 확인
- 프로토콜 (https://) 포함 확인

### 메모리 부족
- Railway 플랜 업그레이드 고려
- JVM 메모리 옵션 조정 (`JAVA_OPTS`)

## 9. 모니터링

### Railway 대시보드
- CPU/메모리 사용량 모니터링
- 로그 실시간 확인
- 비용 추적

### Application 로그
```bash
# Railway CLI로 로그 확인
railway logs

# 또는 대시보드에서 Logs 탭 확인
```

## 10. 프로덕션 체크리스트

- [ ] 강력한 JWT_SECRET 설정
- [ ] CRYPTO_SECRET_KEY 설정
- [ ] Google OAuth2 크레덴셜 설정
- [ ] CORS 도메인 올바르게 설정
- [ ] Binance API 키 설정 (프로덕션용)
- [ ] USE_BINANCE_TESTNET=false 설정 (프로덕션)
- [ ] 커스텀 도메인 설정 (선택사항)
- [ ] SSL/TLS 인증서 확인
- [ ] 백업 전략 수립
- [ ] 모니터링 및 알림 설정

## 지원 및 문의

- Railway 문서: https://docs.railway.app
- Railway 커뮤니티: https://discord.gg/railway
- 프로젝트 이슈: GitHub Issues