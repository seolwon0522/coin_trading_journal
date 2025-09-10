# 🚀 Crypto Trading Journal & Bot Platform

[![Frontend CI](https://github.com/kimminkyu-link/coin_trading_journal/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/kimminkyu-link/coin_trading_journal/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/kimminkyu-link/coin_trading_journal/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/kimminkyu-link/coin_trading_journal/actions/workflows/backend-ci.yml)
[![Deploy Production](https://github.com/kimminkyu-link/coin_trading_journal/actions/workflows/deploy.yml/badge.svg)](https://github.com/kimminkyu-link/coin_trading_journal/actions/workflows/deploy.yml)

암호화폐 트레이딩을 위한 통합 플랫폼 - 거래 기록 관리, AI 기반 성과 분석, 자동매매 시스템

## 🌟 주요 기능

### 📊 트레이딩 저널
- **실시간 거래 기록**: Binance API 자동 동기화
- **포트폴리오 추적**: 실시간 자산 현황 및 수익률 모니터링
- **거래 성과 분석**: 전략별, 심볼별, 시간대별 통계

### 🤖 AI/ML 분석
- **거래 점수화**: XGBoost 기반 거래 성과 평가
- **패턴 인식**: 성공/실패 거래 패턴 자동 분석
- **백테스팅**: Nautilus Trader 기반 전략 검증

### ⚡ 자동매매 시스템
- **실시간 봇 트레이딩**: 설정된 전략에 따른 자동 매매
- **리스크 관리**: 자동 손절/익절 및 포지션 관리
- **다중 전략 지원**: 다양한 매매 전략 동시 운영

## 🏗️ 시스템 아키텍처

```
coin_trading_journal/
│
├── 📁 frontend/                 # Next.js 15.4.5 웹 애플리케이션
│   ├── src/app/                # App Router
│   ├── src/components/         # React 컴포넌트
│   └── src/lib/               # API 클라이언트 및 유틸리티
│
├── 📁 backend/                  # Spring Boot 3.5.4 API 서버
│   ├── src/main/java/         # Java 17 소스 코드
│   └── src/main/resources/    # 설정 파일
│
├── 📁 ml_scoring/              # Python ML 점수화 서비스
│   ├── app/                   # FastAPI 애플리케이션
│   └── ml/                    # ML 모델 (XGBoost)
│
├── 📁 trading-engine/          # 자동매매 엔진
│   └── fastapi/               # FastAPI 트레이딩 서비스
│
├── 📁 nautilus-ml-pipeline/    # 백테스팅 파이프라인
│   └── strategies/            # Nautilus Trader 전략
│
└── 📁 .github/workflows/       # GitHub Actions CI/CD
```

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15.4.5, React 19.1.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4, shadcn/ui
- **State**: TanStack Query v5, React Hook Form
- **Charts**: Chart.js, Recharts
- **Auth**: NextAuth.js

### Backend
- **Framework**: Spring Boot 3.5.4
- **Language**: Java 17
- **Database**: PostgreSQL 15, Redis 7.0
- **Security**: Spring Security, JWT
- **Build**: Gradle 8.x

### ML/AI Services
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **ML**: XGBoost, scikit-learn
- **Backtesting**: Nautilus Trader
- **Data**: pandas, NumPy

### Infrastructure
- **Frontend Hosting**: Vercel (자동 배포)
- **Backend Hosting**: Railway (자동 배포)
- **CI/CD**: GitHub Actions
- **Containerization**: Docker & Docker Compose

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 20+
- Java 17+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7.0+

### 로컬 개발 환경 설정

#### 1. 저장소 클론
```bash
git clone https://github.com/kimminkyu-link/coin_trading_journal.git
cd coin_trading_journal
```

#### 2. 환경 변수 설정
```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend  
cp backend/src/main/resources/application.yml.example backend/src/main/resources/application.yml
```

#### 3. Docker로 데이터베이스 실행
```bash
docker-compose up -d postgres redis
```

#### 4. Backend 실행
```bash
cd backend
./gradlew bootRun
# http://localhost:8080
```

#### 5. Frontend 실행
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

#### 6. ML 서비스 실행 (선택사항)
```bash
cd ml_scoring
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## 📦 배포

### 자동 배포
main 브랜치에 push하면 자동으로 배포됩니다:
- **Frontend**: Vercel이 `/frontend` 변경 감지 → 자동 배포
- **Backend**: Railway가 `/backend` 변경 감지 → 자동 배포

### 배포 URL
- **Frontend**: https://your-app.vercel.app
- **Backend API**: https://coin-trading-journal-production.up.railway.app
- **API 문서**: https://coin-trading-journal-production.up.railway.app/swagger-ui

## 🔐 인증 및 보안

### JWT 인증 플로우
```
로그인 → Access Token (15분) + Refresh Token (7일) 발급
API 요청 → Bearer Token 헤더 포함
토큰 만료 → Refresh Token으로 자동 갱신
```

### 보안 기능
- OAuth 2.0 (Google 소셜 로그인)
- JWT 토큰 기반 인증
- API Key 암호화 (AES-256)
- CORS 설정
- Rate Limiting

## 📊 주요 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/refresh` - 토큰 갱신
- `GET /api/auth/me` - 현재 사용자 정보

### 거래
- `GET /api/trades` - 거래 목록 조회
- `POST /api/trades` - 거래 생성
- `POST /api/trades/sync` - Binance 동기화

### 포트폴리오
- `GET /api/portfolio` - 포트폴리오 조회
- `GET /api/portfolio/summary` - 포트폴리오 요약
- `PUT /api/portfolio/{symbol}/buy-price` - 매수가 업데이트

### 통계
- `GET /api/trades/statistics` - 거래 통계
- `GET /api/trades/statistics/time-heatmap` - 시간대별 히트맵

## 🧪 테스트

```bash
# Frontend
cd frontend
npm run test
npm run lint
npm run type-check

# Backend
cd backend
./gradlew test
./gradlew check

# ML Service
cd ml_scoring
pytest tests/
```

## 🤝 기여하기

### 브랜치 전략
- `main`: 프로덕션 브랜치
- `feature/*`: 기능 개발
- `fix/*`: 버그 수정

### 커밋 컨벤션
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 업무 수정
```

## 📈 성능 지표

- API 응답 시간: < 200ms
- 페이지 로드: < 2초
- WebSocket 지연: < 50ms
- 데이터베이스 쿼리: < 100ms

## 🐛 트러블슈팅

### Frontend 빌드 오류
```bash
rm -rf node_modules .next
npm install
npm run build
```

### Backend 빌드 오류
```bash
./gradlew clean build --refresh-dependencies
```

### Docker 이슈
```bash
docker-compose down -v
docker-compose up -d
```

## 📝 라이선스

MIT License - [LICENSE](LICENSE) 파일 참조

## 📞 지원

- **이슈**: [GitHub Issues](https://github.com/kimminkyu-link/coin_trading_journal/issues)
- **디스커션**: [GitHub Discussions](https://github.com/kimminkyu-link/coin_trading_journal/discussions)

---

**Made with ❤️ by the Crypto Trading Journal Team**