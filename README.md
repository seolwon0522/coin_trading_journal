# 🚀 CryptoTradeManager

<div align="center">

![CryptoTradeManager Logo](https://img.shields.io/badge/CryptoTradeManager-v1.0.0-blue?style=for-the-badge)

**AI 기반 암호화폐 트레이딩 저널 & 자동매매 플랫폼**

[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-brightgreen?style=flat-square&logo=spring)](https://spring.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[🌐 Live Demo](https://demo.cryptotrade.com) | [📖 Documentation](https://docs.cryptotrade.com) | [🐛 Report Bug](https://github.com/cryptotrade/issues) | [✨ Request Feature](https://github.com/cryptotrade/issues)

</div>

---

## 📌 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🔐 JWT Authentication Flow](#-jwt-authentication-flow)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🔧 Configuration](#-configuration)
- [📖 API Documentation](#-api-documentation)
- [📊 Project Structure](#-project-structure)
- [🧪 Testing](#-testing)
- [🚢 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📈 Roadmap](#-roadmap)
- [⚠️ Troubleshooting](#️-troubleshooting)
- [📄 License](#-license)

---

## 🎯 Overview

**CryptoTradeManager**는 암호화폐 트레이더를 위한 차세대 통합 플랫폼입니다. 실시간 시장 데이터, AI 기반 분석, 자동매매, 그리고 체계적인 포트폴리오 관리를 하나의 플랫폼에서 제공합니다.

### 🌟 Why CryptoTradeManager?

| 문제점 | 우리의 솔루션 |
|--------|--------------|
| 📝 **수동 거래 기록의 번거로움** | Binance API 자동 동기화 & 원클릭 거래 입력 |
| 📊 **분산된 분석 도구들** | 통합 대시보드에서 모든 지표 확인 |
| 🤖 **복잡한 자동매매 설정** | 직관적인 전략 빌더 & 백테스팅 |
| 💡 **객관적 피드백 부재** | AI 기반 거래 패턴 분석 & 개선 제안 |
| 📉 **리스크 관리 어려움** | 실시간 포지션 모니터링 & 자동 손절 |

---

## ✨ Key Features

### 📊 거래 관리 (Trade Management)
- ✅ **실시간 거래 기록**: Binance API 자동 동기화 (24시간 거래 데이터)
- ✅ **수동 거래 입력**: 다른 거래소 거래도 관리 가능
- ✅ **거래 전략 태깅**: BREAKOUT, TREND_FOLLOWING, MEAN_REVERSION, SCALPING 등
- ✅ **손익 자동 계산**: 수수료 포함 정확한 PnL 계산

### 💼 포트폴리오 관리 (Portfolio Management)
- ✅ **실시간 자산 조회**: Binance API 연동으로 실시간 잔고 확인
- ✅ **포트폴리오 요약**: 총 자산, 수익률, 손익 한눈에 확인
- ✅ **매수 평균가 관리**: 수동 업데이트 및 자동 계산
- ✅ **다중 자산 지원**: 여러 암호화폐 동시 관리

### 📈 분석 & 통계 (Analytics & Statistics)
- ✅ **실시간 대시보드**: 포트폴리오 현황과 거래 통계
- ✅ **승률/손익비 분석**: 전략별, 심볼별, 시간대별 성과 분석
- ✅ **시간대별 히트맵**: 최적 거래 시간 발견
- ✅ **리스크 지표**: Win Rate, Profit Factor, Average P&L

### 🤖 AI & 자동화 (AI & Automation)
- ✅ **ML 스코어링 엔진**: XGBoost 기반 거래 평가
- ✅ **백테스팅 엔진**: Nautilus Trader 활용 전략 검증
- 🚧 **GPT-4 분석**: 거래 패턴 AI 리포트 (개발 중)
- 🚧 **자동 매매 봇**: 24/7 자동 거래 시스템 (개발 중)

### 🔐 보안 & 신뢰성 (Security & Reliability)
- ✅ **JWT 기반 인증**: Access Token (15분) + Refresh Token (7일)
- ✅ **OAuth 2.0**: Google 소셜 로그인 지원
- ✅ **API 키 암호화**: AES-256 암호화로 안전한 저장
- ✅ **토큰 자동 갱신**: 401 에러 시 자동 토큰 갱신

---

## 🏗️ System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js 15 + React 19]
        MOBILE[Mobile App<br/>React Native<br/>🚧 개발 예정]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx<br/>Reverse Proxy]
    end
    
    subgraph "Application Layer"
        AUTH[Auth Service<br/>Spring Security + JWT]
        TRADE[Trade Service<br/>Spring Boot]
        PORTFOLIO[Portfolio Service<br/>Spring Boot]
        MARKET[Market Service<br/>WebSocket]
    end
    
    subgraph "ML/AI Layer"
        SCORING[ML Scoring<br/>FastAPI + XGBoost]
        TRADING[Trading Engine<br/>FastAPI]
        BACKTEST[Backtest Engine<br/>Nautilus Trader]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL 15<br/>Main DB)]
        REDIS[(Redis 7.0<br/>Cache & Session)]
    end
    
    subgraph "External Services"
        BINANCE[Binance API<br/>Market Data & Trading]
        GOOGLE[Google OAuth<br/>Authentication]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    NGINX --> AUTH
    NGINX --> TRADE
    NGINX --> PORTFOLIO
    NGINX --> MARKET
    
    TRADE --> PG
    PORTFOLIO --> PG
    AUTH --> PG
    MARKET --> REDIS
    
    TRADE --> SCORING
    PORTFOLIO --> TRADING
    TRADING --> BACKTEST
    
    MARKET --> BINANCE
    PORTFOLIO --> BINANCE
    AUTH --> GOOGLE
```

### Data Flow

1. **User Request** → Nginx → Spring Boot API → PostgreSQL
2. **Market Data** → Binance WebSocket → Redis Cache → Frontend
3. **Trade Analysis** → Trade Service → ML Scoring Engine → Results
4. **Portfolio Sync** → Binance API → Portfolio Service → Database

---

## 🔐 JWT Authentication Flow

### 1️⃣ **전체 인증 플로우**

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🖥️ Frontend
    participant AuthStorage as 💾 AuthStorage
    participant Axios as 🔄 Axios
    participant Backend as 🖥️ Backend
    participant DB as 🗄️ Database

    %% 로그인 플로우
    rect rgb(200, 230, 201)
        Note over User,DB: 🔑 로그인 플로우
        User->>Frontend: 로그인 요청
        Frontend->>Backend: POST /api/auth/login
        Backend->>DB: 사용자 확인
        DB-->>Backend: 사용자 정보
        Backend->>Backend: JWT 생성
        Backend-->>Frontend: AccessToken + RefreshToken
        Frontend->>AuthStorage: 토큰 저장
        Frontend->>User: 로그인 성공
    end

    %% API 요청 플로우
    rect rgb(201, 218, 248)
        Note over User,DB: 📡 API 요청 플로우
        User->>Frontend: 데이터 요청
        Frontend->>Axios: API 호출
        Axios->>AuthStorage: AccessToken 조회
        AuthStorage-->>Axios: AccessToken
        Axios->>Backend: Bearer Token 포함 요청
        Backend->>Backend: JWT 검증
        Backend->>DB: 데이터 조회
        DB-->>Backend: 데이터
        Backend-->>Frontend: 응답 데이터
        Frontend->>User: 데이터 표시
    end

    %% 토큰 갱신 플로우
    rect rgb(255, 235, 201)
        Note over User,DB: 🔄 토큰 갱신 플로우
        Frontend->>Backend: API 요청 (만료된 토큰)
        Backend-->>Frontend: 401 Unauthorized
        Frontend->>AuthStorage: RefreshToken 조회
        Frontend->>Backend: POST /api/auth/refresh
        Backend->>Backend: RefreshToken 검증
        Backend->>Backend: 새 토큰 발급
        Backend-->>Frontend: 새 AccessToken + RefreshToken
        Frontend->>AuthStorage: 토큰 업데이트
        Frontend->>Backend: 원래 요청 재시도
        Backend-->>Frontend: 성공 응답
    end
```

### 2️⃣ **Frontend 토큰 처리 아키텍처**

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐        ┌──────────────────┐          │
│  │   User       │        │  auth-api.ts     │          │
│  │   Login      │───────▶│  - login()       │          │
│  │   Form       │        │  - refresh()     │          │
│  └──────────────┘        │  - logout()      │          │
│                          └────────┬─────────┘          │
│                                   │                     │
│                                   ▼                     │
│  ┌──────────────────────────────────────────┐          │
│  │         auth-provider.tsx                │          │
│  │  ┌──────────────────────────────────┐    │          │
│  │  │  Request Interceptor             │    │          │
│  │  │  - AccessToken 추가              │    │          │
│  │  └──────────────────────────────────┘    │          │
│  │  ┌──────────────────────────────────┐    │          │
│  │  │  Response Interceptor            │    │          │
│  │  │  - 401 처리                      │    │          │
│  │  │  - Token Refresh                 │    │          │
│  │  └──────────────────────────────────┘    │          │
│  └────────────────┬─────────────────────────┘          │
│                   │                                     │
│                   ▼                                     │
│  ┌──────────────────────────────────────────┐          │
│  │         auth-storage.ts                  │          │
│  │  ┌────────────────┬─────────────────┐    │          │
│  │  │   Memory       │   LocalStorage   │    │          │
│  │  │                │                  │    │          │
│  │  │  accessToken   │ ctj_access_token │    │          │
│  │  │  refreshToken  │ ctj_refresh_token│    │          │
│  │  └────────────────┴─────────────────┘    │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3️⃣ **Backend JWT 처리 아키텍처**

```
┌─────────────────────────────────────────────────────────┐
│                  Backend (Spring Boot)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │       JwtAuthenticationFilter            │          │
│  │  ┌────────────────────────────────────┐  │          │
│  │  │ 1. Authorization Header 추출       │  │          │
│  │  │    TokenExtractor.extractToken()   │  │          │
│  │  └────────────────┬───────────────────┘  │          │
│  │                   ▼                       │          │
│  │  ┌────────────────────────────────────┐  │          │
│  │  │ 2. Token 검증                      │  │          │
│  │  │    TokenValidator.isValidToken()   │  │          │
│  │  └────────────────┬───────────────────┘  │          │
│  │                   ▼                       │          │
│  │  ┌────────────────────────────────────┐  │          │
│  │  │ 3. SecurityContext 설정            │  │          │
│  │  │    UserDetails 로드                │  │          │
│  │  └────────────────────────────────────┘  │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │          JwtTokenProvider                │          │
│  │  ┌────────────────────────────────────┐  │          │
│  │  │ • createAccessToken()              │  │          │
│  │  │ • createRefreshToken()             │  │          │
│  │  │ • validateTokenWithResult()        │  │          │
│  │  │ • getUserIdFromToken()             │  │          │
│  │  └────────────────────────────────────┘  │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │           AuthController                 │          │
│  │  ┌────────────────────────────────────┐  │          │
│  │  │ POST /api/auth/login               │  │          │
│  │  │ POST /api/auth/refresh             │  │          │
│  │  │ GET  /api/auth/me                  │  │          │
│  │  │ POST /api/auth/logout              │  │          │
│  │  └────────────────────────────────────┘  │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4️⃣ **토큰 라이프사이클**

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│  Issue   │────▶│  Store   │────▶│   Use    │────▶│  Expire  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                       │                 │                │                │
                       │                 │                │                │
                 ┌──────────┐      ┌──────────┐    ┌──────────┐    ┌──────────┐
                 │ Generate │      │  Memory  │    │  Attach  │    │ Refresh  │
                 │   JWT    │      │    +     │    │    to    │    │   Token  │
                 │  Tokens  │      │ Storage  │    │ Headers  │    │  Rotate  │
                 └──────────┘      └──────────┘    └──────────┘    └──────────┘
```

### 📊 **토큰 플로우 요약**

| 단계 | Frontend | Backend | 설명 |
|------|----------|---------|------|
| 1️⃣ | 로그인 요청 | 사용자 검증 | 이메일/비밀번호 확인 |
| 2️⃣ | 토큰 수신 | JWT 생성 | Access(15분) + Refresh(7일) |
| 3️⃣ | authStorage 저장 | - | Memory + localStorage |
| 4️⃣ | API 요청 시 첨부 | 토큰 검증 | Bearer Token 헤더 |
| 5️⃣ | 401 응답 처리 | 토큰 만료 응답 | 자동 갱신 시도 |
| 6️⃣ | Refresh 요청 | 새 토큰 발급 | Rolling Refresh |
| 7️⃣ | 로그아웃 | 토큰 무효화 | DB에서 Refresh 삭제 |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.4.5 | Full-stack React framework |
| **React** | 19.1.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.0 | Utility-first CSS |
| **Shadcn/ui** | Latest | UI component library |
| **TanStack Query** | 5.84 | Server state management |
| **Chart.js** | 4.5 | Data visualization |
| **React Hook Form** | 7.62 | Form management |
| **Zod** | 4.0 | Schema validation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 3.5.4 | Main backend framework |
| **Java** | 17 | Programming language |
| **Spring Security** | 6.0 | Authentication & authorization |
| **JPA/Hibernate** | 6.0 | ORM |
| **JWT (jjwt)** | 0.12.3 | Token management |
| **PostgreSQL Driver** | 42.7.2 | Database connectivity |
| **Gradle** | 8.x | Build tool |

### ML/AI Services
| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.104 | ML API framework |
| **Python** | 3.11+ | Programming language |
| **XGBoost** | 2.0 | ML model training |
| **Pandas** | 2.0 | Data processing |
| **NumPy** | Latest | Numerical computing |
| **Nautilus Trader** | Latest | Backtesting engine |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15 | Primary database |
| **Redis** | 7.0 | Caching & sessions |
| **Docker** | 24.0 | Containerization |
| **Docker Compose** | 2.x | Container orchestration |
| **Nginx** | 1.25 | Reverse proxy |

---

## 🚀 Quick Start

### Prerequisites

- 🐳 Docker & Docker Compose
- 📦 Node.js 18+ & npm 9+
- ☕ Java 17+
- 🐍 Python 3.11+ (ML services)
- 🗄️ PostgreSQL 15+ (or use Docker)
- 🔴 Redis 7.0+ (or use Docker)

### One-Command Start

```bash
# Clone and start everything
git clone https://github.com/yourusername/coin_trading_journal.git
cd coin_trading_journal
cp env.example .env
docker-compose up -d
```

Access the application at http://localhost:3000

---

## 📦 Installation

### 1️⃣ Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/coin_trading_journal.git
cd coin_trading_journal
```

### 2️⃣ Environment Configuration

Create `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://cryptouser:cryptopass@localhost:5432/cryptodb
DB_USERNAME=cryptouser
DB_PASSWORD=cryptopass
REDIS_HOST=localhost
REDIS_PORT=6379

# Binance API (Get from https://www.binance.com/en/my/settings/api-management)
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_TOKEN_VALIDITY_IN_SECONDS=900  # 15 minutes
JWT_REFRESH_TOKEN_VALIDITY_IN_SECONDS=604800  # 7 days

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### 3️⃣ Database Setup

```bash
# Using Docker
docker-compose up -d postgres redis

# Or install locally and create database
psql -U postgres
CREATE DATABASE cryptodb;
CREATE USER cryptouser WITH PASSWORD 'cryptopass';
GRANT ALL PRIVILEGES ON DATABASE cryptodb TO cryptouser;
```

### 4️⃣ Start Services

#### Development Mode

```bash
# Terminal 1: Backend
cd backend
./gradlew bootRun

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: ML Service (Optional)
cd ml_scoring
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Terminal 4: Trading Engine (Optional)
cd trading-engine
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8002
```

#### Production Mode

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 🔧 Configuration

### Backend Configuration

`backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/cryptodb}
    username: ${DB_USERNAME:cryptouser}
    password: ${DB_PASSWORD:cryptopass}
  
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}

jwt:
  secret: ${JWT_SECRET}
  access-token-validity-in-seconds: ${JWT_ACCESS_TOKEN_VALIDITY_IN_SECONDS:900}
  refresh-token-validity-in-seconds: ${JWT_REFRESH_TOKEN_VALIDITY_IN_SECONDS:604800}

encryption:
  key: ${ENCRYPTION_KEY}

binance:
  api:
    key: ${BINANCE_API_KEY}
    secret: ${BINANCE_SECRET_KEY}
    baseUrl: https://api.binance.com
```

### Frontend Configuration

`frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

---

## 📖 API Documentation

### Authentication Endpoints

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    }
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer {refreshToken}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

### Trade Endpoints

#### Create Trade
```http
POST /api/trades
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "SPOT",
  "tradingStrategy": "TREND_FOLLOWING",
  "quantity": 0.001,
  "price": 50000,
  "entryTime": "2024-01-20T10:00:00Z"
}
```

#### Get Trades
```http
GET /api/trades?page=0&size=20&sortBy=executedAt&direction=DESC
Authorization: Bearer {accessToken}
```

#### Sync with Binance
```http
POST /api/trades/sync
Authorization: Bearer {accessToken}
```

### Portfolio Endpoints

#### Get Portfolio
```http
GET /api/portfolio
Authorization: Bearer {accessToken}
```

#### Get Portfolio Summary
```http
GET /api/portfolio/summary
Authorization: Bearer {accessToken}
```

#### Update Buy Price
```http
PUT /api/portfolio/{symbol}/buy-price
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "averageBuyPrice": 45000.00
}
```

### Statistics Endpoints

#### Get Trade Statistics
```http
GET /api/trades/statistics?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {accessToken}
```

#### Get Time Heatmap
```http
GET /api/trades/statistics/time-heatmap
Authorization: Bearer {accessToken}
```

For complete API documentation, visit Swagger UI after starting the backend:
http://localhost:8080/swagger-ui.html

---

## 📊 Project Structure

```
coin_trading_journal/
├── 📁 backend/                      # Spring Boot Backend
│   ├── 📁 src/main/java/com/example/trading_bot/
│   │   ├── 📁 auth/                # Authentication & JWT
│   │   │   ├── 📁 jwt/             # JWT token management
│   │   │   ├── 📁 controller/      # Auth endpoints
│   │   │   ├── 📁 service/         # Auth business logic
│   │   │   └── 📁 util/            # Token utilities
│   │   ├── 📁 trade/               # Trade management
│   │   │   ├── 📁 controller/      # Trade endpoints
│   │   │   ├── 📁 service/         # Trade business logic
│   │   │   ├── 📁 repository/      # Trade data access
│   │   │   └── 📁 dto/             # Trade DTOs
│   │   ├── 📁 portfolio/           # Portfolio management
│   │   │   ├── 📁 controller/      # Portfolio endpoints
│   │   │   ├── 📁 service/         # Portfolio logic
│   │   │   └── 📁 entity/          # Portfolio entities
│   │   ├── 📁 binance/             # Binance API integration
│   │   │   ├── 📁 client/          # API client
│   │   │   └── 📁 dto/             # Binance DTOs
│   │   └── 📁 common/              # Shared utilities
│   └── 📄 build.gradle
│
├── 📁 frontend/                     # Next.js Frontend
│   ├── 📁 src/
│   │   ├── 📁 app/                 # Next.js App Router
│   │   ├── 📁 components/          # React components
│   │   │   ├── 📁 trades/          # Trade components
│   │   │   ├── 📁 portfolio/       # Portfolio components
│   │   │   ├── 📁 statistics/      # Statistics charts
│   │   │   └── 📁 ui/              # Shadcn/ui components
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   ├── 📁 lib/                 # Utilities
│   │   │   ├── 📁 api/             # API clients
│   │   │   ├── auth-storage.ts     # Token management
│   │   │   └── axios.ts            # Axios config
│   │   └── 📁 types/               # TypeScript types
│   └── 📄 package.json
│
├── 📁 ml_scoring/                   # ML Scoring Engine
│   ├── 📁 app/                     # FastAPI app
│   ├── 📁 ml/                      # ML models
│   └── 📄 requirements.txt
│
├── 📁 trading-engine/               # Trading Automation
│   ├── 📁 app/                     # Trading strategies
│   └── 📄 requirements.txt
│
├── 📁 nautilus-ml-pipeline/        # Backtesting
│   ├── 📁 ml_pipeline/             # ML pipeline
│   └── 📄 requirements.txt
│
├── 📄 docker-compose.yml            # Docker setup
├── 📄 .env.example                  # Environment template
└── 📄 README.md                     # This file
```

---

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
./gradlew test
./gradlew integrationTest

# Frontend tests
cd frontend
npm run test
npm run test:e2e
npm run test:coverage

# ML Service tests
cd ml_scoring
pytest tests/ -v

# All tests with Docker
docker-compose run --rm backend ./gradlew test
docker-compose run --rm frontend npm test
```

### Test Coverage

| Module | Coverage | Target |
|--------|----------|--------|
| Backend | 72% | >80% |
| Frontend | 65% | >70% |
| ML Service | 81% | >80% |

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build all images
docker-compose build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Manual Deployment

#### Backend
```bash
cd backend
./gradlew build
java -jar build/libs/trading-bot-0.0.1-SNAPSHOT.jar
```

#### Frontend
```bash
cd frontend
npm run build
npm start
```

### Environment-Specific Configurations

- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Commit Convention

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 업무 수정
```

### Code Style

- **Java**: Google Java Style Guide
- **TypeScript**: ESLint + Prettier
- **Python**: Black + isort

---

## 📈 Roadmap

### Phase 1: Foundation (Q1 2024) ✅
- [x] User authentication (JWT + OAuth)
- [x] Trade CRUD operations
- [x] Binance API integration
- [x] Portfolio management
- [x] Basic statistics

### Phase 2: Analytics (Q2 2024) 🚧
- [x] Advanced statistics
- [x] Time-based heatmaps
- [x] ML scoring engine
- [ ] Strategy backtesting UI
- [ ] Risk metrics dashboard

### Phase 3: AI Integration (Q3 2024)
- [ ] GPT-4 trade analysis
- [ ] Pattern recognition
- [ ] Predictive analytics
- [ ] Automated insights

### Phase 4: Automation (Q4 2024)
- [ ] Auto-trading bots
- [ ] Strategy marketplace
- [ ] Social trading
- [ ] Mobile app

### Phase 5: Scale (2025)
- [ ] Multi-exchange support
- [ ] DeFi integration
- [ ] Copy trading
- [ ] Institutional features

---

## ⚠️ Troubleshooting

### Common Issues

#### 🔴 Backend won't start
```bash
# Check Java version
java -version  # Should be 17+

# Check database connection
psql -h localhost -U cryptouser -d cryptodb

# Check port availability
lsof -i :8080
```

#### 🔴 Frontend build errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

#### 🔴 Docker issues
```bash
# Reset everything
docker-compose down -v
docker system prune -a
docker-compose up -d
```

#### 🔴 JWT Token issues
```bash
# Check token expiration
# Access Token: 15 minutes
# Refresh Token: 7 days

# Clear browser storage
localStorage.clear()
```

#### 🔴 Binance API errors
- Check API key permissions
- Verify IP whitelist
- Check rate limits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Binance](https://www.binance.com) - Market data and trading API
- [Nautilus Trader](https://nautilustrader.io) - Backtesting engine
- [Shadcn/ui](https://ui.shadcn.com) - Beautiful UI components
- [Spring Boot](https://spring.io) - Java framework
- [Next.js](https://nextjs.org) - React framework

---

## 📞 Support

- 📧 Email: support@cryptotrade.com
- 💬 Discord: [Join our community](https://discord.gg/cryptotrade)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/coin_trading_journal/issues)

---

<div align="center">

**Built with ❤️ by the CryptoTrade Team**

⭐ Star us on GitHub — it helps!

[🔝 Back to Top](#-cryptotrademanager)

</div>