# Railway 배포 가이드 (Best Practice)

## 🚀 개요
이 문서는 Spring Boot 백엔드를 Railway에 배포하기 위한 최적화된 설정 가이드입니다.

## 📦 배포 파일 구조

```
backend/
├── src/                          # 소스 코드
├── build.gradle                  # Gradle 빌드 설정
├── gradlew                       # Gradle Wrapper
├── system.properties            # Java 버전 명시
├── nixpacks.toml               # Railway 빌드 설정
├── railway.toml                # Railway 배포 설정
├── Procfile                    # 실행 명령
└── src/main/resources/
    └── application-railway.yaml # Railway 환경 설정
```

## ⚙️ 핵심 설정 파일

### 1. system.properties
```properties
java.runtime.version=17
```

### 2. nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["jdk17", "gradle"]

[phases.build]
cmds = ["./gradlew build -x test --no-daemon"]

[start]
cmd = "java -Xmx512m -Dserver.port=${PORT:-8080} -Dspring.profiles.active=railway -jar build/libs/trading-bot.jar"
```

### 3. Procfile
```
web: java -Xmx512m -Xms256m -Dserver.port=$PORT -Dspring.profiles.active=railway -jar build/libs/trading-bot.jar
```

### 4. railway.toml
```toml
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/actuator/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

## 🔧 Railway 환경 변수 설정 (복사하여 사용)

Railway 대시보드에서 설정해야 할 환경 변수:

```bash
# 데이터베이스 (Railway PostgreSQL 애드온 사용 시 자동 설정)
DATABASE_URL=postgresql://postgres:RailwayPassword123@postgres.railway.internal:5432/railway
PGPASSWORD=RailwayPassword123
PGUSER=postgres
PGDATABASE=railway
PGHOST=postgres.railway.internal
PGPORT=5432

# JWT 설정 (256비트 이상의 안전한 키)
JWT_SECRET=ThisIsAVerySecureJWTSecretKeyForProductionUse1234567890AbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ

# Binance API (테스트넷 사용)
BINANCE_API_KEY=your_binance_testnet_api_key_here
BINANCE_SECRET_KEY=your_binance_testnet_secret_key_here
USE_BINANCE_TESTNET=true

# Google OAuth2 (이미 설정된 클라이언트 ID 사용)
GOOGLE_CLIENT_ID=617965160441-duhprvkkvvhgifgp12osligng8scp8bd.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_actual_google_client_secret_here

# CORS 설정 (프론트엔드 URL 업데이트 필요)
CORS_ALLOWED_ORIGINS=https://autotradings.vercel.app/,https://your-frontend-app.railway.app,http://localhost:3000

# 암호화 키 (Base64 인코딩된 32바이트 키)
CRYPTO_SECRET_KEY=3saXgsXn/tNN4CwUzOHLfy23f39UIT/W6uXD5N2HxeY=

# Spring 프로파일 (Railway가 자동 설정)
SPRING_PROFILES_ACTIVE=railway

# 타임존 설정
TZ=Asia/Seoul

# 포트 (Railway가 자동 설정하므로 설정 불필요)
# PORT=8080

# 로그 레벨 (선택사항)
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_EXAMPLE_TRADING_BOT=DEBUG
```

## 📝 배포 단계

### 1. GitHub 연동
```bash
# Railway 프로젝트와 GitHub 저장소 연결
# Railway 대시보드에서 설정
```

### 2. PostgreSQL 데이터베이스 추가
1. Railway 대시보드에서 "New" → "Database" → "Add PostgreSQL" 클릭
2. PostgreSQL이 추가되면 자동으로 DATABASE_URL 등 환경 변수가 설정됨
3. 위의 환경 변수 중 PG로 시작하는 변수들은 자동 생성됨

### 3. 환경 변수 설정
1. Railway 대시보드에서 백엔드 서비스 선택
2. "Variables" 탭 클릭
3. "Raw Editor" 모드로 전환
4. 위의 환경 변수들을 복사하여 붙여넣기
5. 실제 값으로 수정:
   - `GOOGLE_CLIENT_SECRET`: Google Cloud Console에서 실제 시크릿 확인
   - `BINANCE_API_KEY`, `BINANCE_SECRET_KEY`: Binance 테스트넷에서 생성
   - `CORS_ALLOWED_ORIGINS`: 실제 프론트엔드 URL로 변경

### 4. 자동 배포 활성화
- GitHub main 브랜치에 push 시 자동 배포
- Railway가 자동으로 빌드 및 배포 실행

### 5. 배포 확인
```bash
# Health Check
curl https://your-app.railway.app/actuator/health

# API 테스트
curl https://your-app.railway.app/api/test

# Swagger UI 접속
https://your-app.railway.app/swagger-ui.html
```

## 🔐 보안 주의사항

### 실제 운영 환경에서 변경해야 할 값들:

1. **JWT_SECRET**: 
   ```bash
   # 새로운 안전한 키 생성 (Linux/Mac)
   openssl rand -base64 64
   
   # 또는 온라인 생성기 사용
   https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
   ```

2. **CRYPTO_SECRET_KEY**:
   ```bash
   # 새로운 32바이트 키 생성
   openssl rand -base64 32
   ```

3. **Google OAuth2 Secret**:
   - Google Cloud Console → APIs & Services → Credentials
   - OAuth 2.0 Client ID 선택 → Client Secret 확인

4. **Binance API Keys**:
   - 테스트: https://testnet.binance.vision/
   - 실제: https://www.binance.com/en/my/settings/api-management

## 🐛 트러블슈팅

### 무한 Initializing 문제
- **원인**: Docker 빌드 설정 문제
- **해결**: Native Nixpacks 빌드 사용 (현재 설정)

### 메모리 부족
- **원인**: 기본 메모리 설정 부족
- **해결**: JVM 메모리 옵션 추가 (-Xmx512m)

### 데이터베이스 연결 실패
- **확인사항**:
  ```sql
  -- Railway PostgreSQL 콘솔에서 테스트
  SELECT version();
  \l  -- 데이터베이스 목록
  \dt -- 테이블 목록
  ```

### 포트 바인딩 실패
- **원인**: PORT 환경 변수 미사용
- **해결**: server.port=${PORT:-8080} 설정

### 빌드 실패
- **원인**: gradlew 실행 권한 문제
- **해결**: Git에서 실행 권한 설정
```bash
git update-index --chmod=+x gradlew
git commit -m "Make gradlew executable"
```

## ✅ 장점

1. **Docker 없이 배포**: 빌드 시간 단축, 복잡도 감소
2. **자동 감지**: Railway가 Java 프로젝트 자동 인식
3. **최적화된 설정**: 메모리, 성능 최적화
4. **Health Check**: 자동 상태 모니터링
5. **자동 재시작**: 장애 시 자동 복구

## 📊 성능 최적화

- **JVM 메모리**: -Xmx512m -Xms256m
- **빌드 캐싱**: Gradle 의존성 캐싱
- **테스트 스킵**: 배포 시 테스트 생략 (-x test)
- **Daemon 비활성화**: --no-daemon으로 리소스 절약

## 🔄 업데이트 방법

```bash
# 코드 수정 후
git add .
git commit -m "Update backend"
git push origin main

# Railway가 자동으로 배포 시작
```

## 📌 주의사항

1. **환경 변수**: 민감한 정보는 반드시 환경 변수로 관리
2. **데이터베이스**: Railway PostgreSQL 애드온 사용 권장
3. **로그**: Railway 대시보드에서 실시간 로그 확인
4. **스케일링**: 필요 시 Railway 대시보드에서 인스턴스 추가

## 🆘 지원

문제 발생 시:
1. Railway 대시보드의 로그 확인
2. `/actuator/health` 엔드포인트 확인
3. 환경 변수 설정 재확인
4. GitHub Actions 로그 확인

## 📋 체크리스트

배포 전 확인사항:
- [ ] gradlew 실행 권한 확인
- [ ] PostgreSQL 애드온 추가
- [ ] 모든 환경 변수 설정
- [ ] CORS 오리진 URL 업데이트
- [ ] JWT_SECRET 변경 (프로덕션)
- [ ] CRYPTO_SECRET_KEY 변경 (프로덕션)
- [ ] Binance API 키 설정
- [ ] Google OAuth2 시크릿 설정