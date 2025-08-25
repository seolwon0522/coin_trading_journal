# 🚀 CryptoTradeManager

<div align="center">

![CryptoTradeManager Logo](https://img.shields.io/badge/CryptoTradeManager-v1.0.0-blue?style=for-the-badge)

**AI 기반 암호화폐 트레이딩 저널 & 자동매매 플랫폼**

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
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
- [🏗️ Architecture](#️-architecture)
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

### 🎯 Target Users

- 📈 **개인 트레이더**: 체계적인 거래 관리가 필요한 분
- 🤖 **알고리즘 트레이더**: 백테스팅과 자동매매를 원하는 분
- 📊 **포트폴리오 매니저**: 다양한 자산을 관리하는 분
- 🎓 **트레이딩 학습자**: 거래 패턴을 분석하고 개선하려는 분

---

## ✨ Key Features

### 📊 거래 관리 (Trade Management)
- ✅ **실시간 거래 기록**: Binance API 자동 동기화
- ✅ **수동 거래 입력**: 다른 거래소 거래도 관리
- ✅ **거래 전략 태깅**: BREAKOUT, TREND, SCALPING 등
- ✅ **손익 자동 계산**: 수수료 포함 정확한 PnL

### 📈 분석 & 통계 (Analytics & Statistics)
- ✅ **실시간 대시보드**: 포트폴리오 현황 한눈에
- ✅ **승률/손익비 분석**: 전략별, 심볼별 성과
- ✅ **시간대별 히트맵**: 최적 거래 시간 발견
- ✅ **리스크 지표**: Sharpe Ratio, Max Drawdown

### 🤖 AI & 자동화 (AI & Automation)
- ✅ **GPT-4 패턴 분석**: 주간 거래 패턴 AI 리포트
- ✅ **자동 매매 봇**: 설정한 전략대로 24/7 거래
- ✅ **백테스팅 엔진**: 과거 데이터로 전략 검증
- ✅ **알림 시스템**: 중요 이벤트 실시간 알림

### 🔐 보안 & 신뢰성 (Security & Reliability)
- ✅ **OAuth 2.0 인증**: 안전한 소셜 로그인
- ✅ **API 키 암호화**: AES-256 암호화 저장
- ✅ **2FA 지원**: 추가 보안 레이어
- ✅ **감사 로그**: 모든 활동 기록

---

## 🏗️ Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Next.js + React]
        MOBILE[Mobile App<br/>React Native]
    end
    
    subgraph "API Gateway"
        NGINX[Nginx<br/>Load Balancer]
    end
    
    subgraph "Application Layer"
        AUTH[Auth Service<br/>Spring Security]
        TRADE[Trade Service<br/>Spring Boot]
        MARKET[Market Service<br/>Spring Boot]
        SCORING[Scoring Engine<br/>FastAPI]
    end
    
    subgraph "ML/AI Layer"
        ML[ML Pipeline<br/>Python + XGBoost]
        GPT[GPT-4 Analyzer<br/>OpenAI API]
        BACKTEST[Backtest Engine<br/>Nautilus Trader]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Main DB)]
        REDIS[(Redis<br/>Cache & Session)]
        KAFKA[Kafka<br/>Event Stream]
    end
    
    subgraph "External Services"
        BINANCE[Binance API]
        COINGECKO[CoinGecko API]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    NGINX --> AUTH
    NGINX --> TRADE
    NGINX --> MARKET
    NGINX --> SCORING
    
    TRADE --> PG
    MARKET --> REDIS
    SCORING --> ML
    ML --> GPT
    ML --> BACKTEST
    
    TRADE --> KAFKA
    MARKET --> KAFKA
    KAFKA --> ML
    
    MARKET --> BINANCE
    MARKET --> COINGECKO
```

### Data Flow

1. **User Request** → Nginx → Spring Boot API → PostgreSQL
2. **Market Data** → Binance WebSocket → Redis Cache → Frontend
3. **Trade Analysis** → Trade Service → Kafka → ML Pipeline → Scoring Engine
4. **AI Insights** → ML Results → GPT-4 → Formatted Report → User

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.0 | Full-stack React framework |
| **TypeScript** | 5.0 | Type safety |
| **Tailwind CSS** | 3.4 | Utility-first CSS |
| **Shadcn/ui** | Latest | UI component library |
| **TanStack Query** | 5.0 | Server state management |
| **Chart.js** | 4.0 | Data visualization |
| **TradingView** | Widgets | Professional charts |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 3.5.4 | Main backend framework |
| **Java** | 17 | Programming language |
| **Spring Security** | 6.0 | Authentication & authorization |
| **JPA/Hibernate** | 6.0 | ORM |
| **Gradle** | 8.5 | Build tool |
| **Flyway** | 9.0 | Database migration |

### ML/AI Services
| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.104 | ML API framework |
| **Python** | 3.11 | Programming language |
| **XGBoost** | 2.0 | ML model training |
| **Pandas** | 2.0 | Data processing |
| **Nautilus Trader** | Latest | Backtesting engine |
| **OpenAI GPT-4** | Latest | AI analysis |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15 | Primary database |
| **Redis** | 7.0 | Caching & sessions |
| **Docker** | 24.0 | Containerization |
| **Nginx** | 1.25 | Reverse proxy |
| **Kafka** | 3.6 | Event streaming |
| **Prometheus** | 2.47 | Monitoring |
| **Grafana** | 10.0 | Visualization |

---

## 🚀 Quick Start

### Prerequisites

- 🐳 Docker & Docker Compose
- 📦 Node.js 18+ & npm 9+
- ☕ Java 17+
- 🐍 Python 3.11+
- 🗄️ PostgreSQL 15+
- 🔴 Redis 7.0+

### One-Line Installation

```bash
curl -fsSL https://get.cryptotrade.com | bash
```

Or manually:

```bash
# Clone repository
git clone https://github.com/yourusername/coin_trading_journal.git
cd coin_trading_journal

# Copy environment files
cp env.example .env

# Start all services
docker-compose up -d

# Open browser
open http://localhost:3000
```

---

## 📦 Installation

### 1️⃣ Clone & Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/coin_trading_journal.git
cd coin_trading_journal

# Install dependencies
npm install
```

### 2️⃣ Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit with your configurations
nano .env
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cryptodb
REDIS_URL=redis://localhost:6379

# Binance API (Get from https://www.binance.com/en/my/settings/api-management)
BINANCE_API_KEY=your_api_key
BINANCE_SECRET_KEY=your_secret_key

# OpenAI (Get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_key

# JWT Secret
JWT_SECRET=your_super_secret_key_change_this

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3️⃣ Database Setup

```bash
# Start PostgreSQL & Redis
docker-compose up -d postgres redis

# Run migrations
cd backend
./gradlew flywayMigrate

# Seed sample data (optional)
./gradlew seedData
```

### 4️⃣ Start Services

#### Development Mode

```bash
# Terminal 1: Backend
cd backend
./gradlew bootRun

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: ML Service
cd ml_scoring
uvicorn app.main:app --reload

# Terminal 4: Trading Engine
cd trading-engine
python -m uvicorn app.main:app --reload --port 8001
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
    url: ${DATABASE_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}

binance:
  api:
    key: ${BINANCE_API_KEY}
    secret: ${BINANCE_SECRET_KEY}
    baseUrl: https://api.binance.com

jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000 # 24 hours
```

### Frontend Configuration

`frontend/.env.local`:

```env
# API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_ML_API_URL=http://localhost:8000

# Features
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

---

## 📖 API Documentation

### Authentication

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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Trades

#### Create Trade
```http
POST /api/trades
Authorization: Bearer {token}
Content-Type: application/json

{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "SPOT",
  "tradingStrategy": "BREAKOUT",
  "quantity": 0.001,
  "price": 50000,
  "entryTime": "2024-01-20T10:00:00Z"
}
```

#### Get Trades
```http
GET /api/trades?page=0&size=20&sortBy=executedAt&direction=DESC
Authorization: Bearer {token}
```

### Statistics

#### Get Portfolio Statistics
```http
GET /api/trades/statistics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

Response:
```json
{
  "totalTrades": 150,
  "winRate": 65.5,
  "totalProfitLoss": 5234.56,
  "sharpeRatio": 1.8,
  "maxDrawdown": -12.3,
  "profitFactor": 2.1
}
```

### Market Data

#### Get Ticker Price
```http
GET /api/market/ticker/BTCUSDT
```

#### WebSocket Stream
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/market');
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['btcusdt@ticker']
}));
```

For complete API documentation, visit: http://localhost:8080/swagger-ui.html

---

## 📊 Project Structure

```
coin_trading_journal/
├── 📁 frontend/                 # Next.js Frontend Application
│   ├── 📁 src/
│   │   ├── 📁 app/             # Next.js App Router pages
│   │   ├── 📁 components/      # React components
│   │   │   ├── 📁 trades/      # Trade-related components
│   │   │   ├── 📁 statistics/  # Statistics components
│   │   │   └── 📁 ui/          # Shadcn/ui components
│   │   ├── 📁 hooks/           # Custom React hooks
│   │   ├── 📁 lib/             # Utilities and helpers
│   │   │   └── 📁 api/         # API client & mappers
│   │   ├── 📁 types/           # TypeScript type definitions
│   │   └── 📁 styles/          # Global styles
│   └── 📄 package.json
│
├── 📁 backend/                  # Spring Boot Backend
│   ├── 📁 src/main/java/com/example/trading_bot/
│   │   ├── 📁 auth/            # Authentication module
│   │   ├── 📁 trade/           # Trade management
│   │   │   ├── 📁 controller/  # REST controllers
│   │   │   ├── 📁 service/     # Business logic
│   │   │   ├── 📁 repository/  # Data access
│   │   │   ├── 📁 entity/      # JPA entities
│   │   │   └── 📁 dto/         # Data transfer objects
│   │   ├── 📁 binance/         # Binance API integration
│   │   └── 📁 common/          # Shared utilities
│   └── 📄 build.gradle
│
├── 📁 ml_scoring/               # ML Scoring Engine (FastAPI)
│   ├── 📁 app/                 # FastAPI application
│   ├── 📁 ml/                  # ML models and logic
│   └── 📄 requirements.txt
│
├── 📁 trading-engine/           # Automated Trading Engine
│   ├── 📁 app/                 # Trading strategies
│   └── 📄 requirements.txt
│
├── 📁 nautilus-ml-pipeline/    # Backtesting & ML Pipeline
│   ├── 📁 ml_pipeline/         # ML training pipeline
│   ├── 📁 risk_management/     # Risk calculations
│   └── 📄 requirements.txt
│
├── 📄 docker-compose.yml        # Docker orchestration
├── 📄 .env.example             # Environment template
└── 📄 README.md                # You are here!
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

# ML Service tests
cd ml_scoring
pytest tests/

# Coverage report
npm run test:coverage
```

### Test Coverage Goals

- Unit Tests: > 80%
- Integration Tests: > 60%
- E2E Tests: Critical paths

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Deploy
docker-compose up -d

# Scale services
docker-compose up -d --scale trade-service=3
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f k8s/

# Check status
kubectl get pods -n cryptotrade

# Access dashboard
kubectl port-forward svc/frontend 3000:3000 -n cryptotrade
```

### Cloud Deployment

#### AWS
```bash
# Deploy with CDK
npm install -g aws-cdk
cdk deploy CryptoTradeStack
```

#### Google Cloud
```bash
# Deploy with Terraform
terraform init
terraform plan
terraform apply
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style

- **Java**: Google Java Style Guide
- **TypeScript**: Prettier + ESLint
- **Python**: Black + isort

### Commit Convention

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
```

Example:
```
feat(trade): add support for futures trading
fix(auth): resolve JWT expiration issue
docs(readme): update installation guide
```

---

## 📈 Roadmap

### Phase 1: Foundation (Q1 2024) ✅
- [x] Basic trade CRUD operations
- [x] User authentication
- [x] Binance API integration
- [x] Simple dashboard

### Phase 2: Analytics (Q2 2024) 🚧
- [x] Advanced statistics
- [x] Time-based heatmaps
- [ ] Strategy backtesting
- [ ] Risk metrics

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

#### 🔴 Docker containers not starting
```bash
# Check logs
docker-compose logs -f

# Reset volumes
docker-compose down -v
docker-compose up -d
```

#### 🔴 Database connection failed
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Test connection
psql -h localhost -U cryptouser -d cryptodb
```

#### 🔴 Frontend build errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

#### 🔴 API rate limits
```bash
# Check Redis cache
redis-cli
> KEYS *rate_limit*
> DEL rate_limit:user:123
```

For more issues, check our [FAQ](https://docs.cryptotrade.com/faq) or [open an issue](https://github.com/cryptotrade/issues).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Binance](https://www.binance.com) - Market data and trading API
- [OpenAI](https://openai.com) - GPT-4 analysis
- [Nautilus Trader](https://nautilustrader.io) - Backtesting engine
- [Shadcn/ui](https://ui.shadcn.com) - Beautiful UI components
- All our [contributors](https://github.com/cryptotrade/contributors)

---

## 📞 Contact & Support

- 📧 Email: support@cryptotrade.com
- 💬 Discord: [Join our community](https://discord.gg/cryptotrade)
- 🐦 Twitter: [@cryptotrade](https://twitter.com/cryptotrade)
- 📺 YouTube: [CryptoTrade Channel](https://youtube.com/@cryptotrade)

---

<div align="center">

**Built with ❤️ by the CryptoTrade Team**

⭐ Star us on GitHub — it helps!

[🔝 Back to Top](#-cryptotrademanager)

</div>