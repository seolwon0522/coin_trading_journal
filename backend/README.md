# Spring Boot 백엔드

CryptoTradeManager의 메인 백엔드 서버입니다.

## 🏗️ 기술 스택

- **Java 17**
- **Spring Boot 3.5.4**
- **Spring Security 6.x**
- **Spring Data JPA**
- **PostgreSQL**
- **JWT + OAuth2**
- **Gradle 8.x**

## 🚀 실행 방법

### 1. 데이터베이스 설정
```sql
CREATE DATABASE trading_journal ENCODING 'UTF8' TEMPLATE template0;
CREATE ROLE journal WITH LOGIN PASSWORD 'journal123';
GRANT ALL PRIVILEGES ON DATABASE trading_journal TO journal;
ALTER DATABASE trading_journal OWNER TO journal;
```

### 2. 환경 변수 설정
```bash
export DB_URL=jdbc:postgresql://localhost:5432/trading_journal
export DB_USERNAME=journal
export DB_PASSWORD=journal123
export JWT_SECRET=your-super-secret-jwt-key-here
```

### 3. 서버 실행
```bash
./gradlew bootRun
```

## 🔌 API 엔드포인트

- **서버**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui/index.html

### 인증 API
```
POST /api/auth/register     # 회원가입
POST /api/auth/login        # 로그인
POST /api/auth/refresh      # 토큰 갱신
GET  /api/auth/oauth2/authorize/{provider}  # OAuth2 소셜 로그인
```

## 📁 프로젝트 구조

```
backend/
├── src/main/java/com/example/trading_bot/
│   ├── TradingBotApplication.java          # 메인 애플리케이션
│   ├── auth/                               # 인증 시스템 ✅
│   ├── common/                             # 공통 컴포넌트 ✅
│   ├── exchange/                           # 거래소 연동 📋
│   ├── trading/                            # 거래 관리 📋
│   ├── bot/                               # 자동매매 봇 📋
│   └── dashboard/                         # 대시보드 📋
├── src/main/resources/
│   ├── application.yaml                   # 설정 파일
│   └── static/                            # 정적 리소스
└── build.gradle                           # 빌드 설정
```

## ✅ 완료된 기능

- 🔐 **완전한 인증 시스템**: JWT + OAuth2 (Google, GitHub)
- 🛡️ **Spring Security 설정**: CORS, JWT 필터, 보안 설정
- 💾 **데이터베이스 연동**: PostgreSQL + JPA
- 🔌 **RESTful API**: 표준화된 응답 구조
- ⚠️ **예외 처리**: 글로벌 예외 핸들러
- 👤 **사용자 관리**: 회원가입, 로그인, 토큰 관리

## 🔄 계획된 기능

- 🏪 **거래소 연동**: Binance API 클라이언트
- 💰 **거래 관리**: 포트폴리오, 거래 기록
- 🤖 **자동매매 봇**: 매매 전략, 봇 엔진
- 📊 **대시보드**: 실시간 데이터, 분석 결과