# 🚀 Crypto Trading Journal

[![Build Status](https://github.com/kimminkyu-link/coin_trading_journal/actions/workflows/deploy.yml/badge.svg)](https://github.com/kimminkyu-link/coin_trading_journal/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-blue.svg)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow.svg)](https://www.python.org/)

**암호화폐 거래를 체계적으로 관리하고 분석하는 올인원 트레이딩 플랫폼**

Binance API와 실시간 연동하여 거래를 자동으로 추적하고, ML 기반으로 성과를 분석하며, 백테스팅과 자동매매까지 지원하는 통합 솔루션입니다.

## 📚 목차

- [✨ 주요 기능](#-주요-기능)
- [🏗️ 시스템 구조](#️-시스템-구조)
- [🚀 빠른 시작](#-빠른-시작)
- [⚙️ 상세 설정](#️-상세-설정)
- [📖 API 문서](#-api-문서)
- [🧪 테스트](#-테스트)
- [🌐 배포](#-배포)
- [🐛 문제 해결](#-문제-해결)
- [🤝 기여하기](#-기여하기)

## ✨ 주요 기능

### 📊 거래 관리 & 추적
- **실시간 동기화**: Binance API와 24시간 거래 내역 자동 연동
- **다중 거래소 지원**: 타 거래소 거래 수동 입력 및 통합 관리
- **전략 분류**: BREAKOUT, TREND_FOLLOWING, MEAN_REVERSION, SCALPING
- **정확한 손익 계산**: 수수료, 슬리피지 포함 실시간 P&L 추적

### 💼 포트폴리오 분석
- **실시간 평가**: 현재 포지션 및 총 자산 실시간 모니터링
- **평균 단가 관리**: 추가 매수/매도 시 자동 평균가 계산
- **멀티 자산**: BTC, ETH, BNB 등 모든 Binance 페어 지원
- **성과 시각화**: 일별/주별/월별 수익률 차트 및 대시보드

### 🤖 ML 기반 분석
- **XGBoost 스코어링**: 거래별 성과 점수 및 개선점 제안
- **패턴 인식**: 반복되는 실수 패턴 및 성공 패턴 분석
- **시간대 분석**: 수익률이 높은 거래 시간대 히트맵
- **전략 최적화**: 전략별 성과 비교 및 최적 파라미터 추천

### 🔄 자동매매 시스템 (Beta)
- **멀티 전략 봇**: 다양한 전략을 동시에 실행하는 봇 프레임워크
- **리스크 관리**: 자동 손절매, 익절매, 트레일링 스탑
- **포지션 사이징**: Kelly Criterion 기반 최적 포지션 크기 계산
- **실시간 모니터링**: WebSocket 기반 실시간 시장 데이터 처리

## 🏗️ 시스템 구조

### 시스템 컴포넌트

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                     │
│                    React 19 + TypeScript + TailwindCSS        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ├── REST API
                                ├── WebSocket
                                │
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Spring Boot)                     │
│                          Java 17                              │
├───────────────────────────────────────────────────────────────┤
│   Trade Service  │  Portfolio Service  │  Auth Service       │
└───────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
┌───────────────┴──┐ ┌─────────┴──────┐ ┌────┴────────────┐
│   PostgreSQL 15  │ │   Redis 7.0    │ │  Binance API   │
│   (Primary DB)   │ │   (Cache)      │ │  (Market Data) │
└──────────────────┘ └────────────────┘ └─────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    ML Services (Python)                       │
├───────────────────────────────────────────────────────────────┤
│  Scoring Engine  │  Trading Engine  │  Backtesting Engine   │
│    (FastAPI)     │    (FastAPI)     │  (Nautilus Trader)   │
└───────────────────────────────────────────────────────────────┘
```

### 기술 스택

#### Frontend
- **프레임워크**: Next.js 15.4.5 (App Router)
- **UI 라이브러리**: React 19.1.0
- **언어**: TypeScript 5.x
- **스타일링**: Tailwind CSS v4 + shadcn/ui
- **상태 관리**: TanStack Query v5
- **폼 관리**: React Hook Form + Zod validation
- **차트**: Chart.js, Recharts

#### Backend
- **프레임워크**: Spring Boot 3.5.4
- **언어**: Java 17
- **빌드 도구**: Gradle 8.x
- **데이터베이스**: PostgreSQL 15 (메인), Redis 7.0 (캐시)
- **ORM**: JPA/Hibernate
- **보안**: Spring Security + JWT
- **API 문서**: Swagger/OpenAPI

#### ML/데이터 사이언스
- **언어**: Python 3.11+
- **웹 프레임워크**: FastAPI
- **ML 라이브러리**: XGBoost, scikit-learn
- **데이터 처리**: pandas, NumPy
- **백테스팅**: Nautilus Trader
- **태스크 큐**: Celery (예정)

#### 인프라
- **컨테이너화**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **프론트엔드 호스팅**: Vercel
- **백엔드 호스팅**: Railway
- **모니터링**: Railway/Vercel 대시보드를 통한 애플리케이션 로그

## 🚀 빠른 시작

### 📋 사전 요구사항

- Node.js 20+ 및 npm 9+ 
- Java 17+ (OpenJDK 권장)
- Python 3.11+
- Docker 및 Docker Compose
- PostgreSQL 15 (또는 Docker 사용)
- Redis 7.0 (또는 Docker 사용)
- Binance API 인증 정보 (실시간 거래 기능용)

### 🔧 설치 가이드

#### 1. 저장소 클론
```bash
git clone https://github.com/seolwon0522/coin_trading_journal.git
cd coin_trading_journal
```

#### 2. 환경 변수 설정

예제 파일을 기반으로 `.env` 파일 생성:

```bash
# 백엔드 환경
cp backend/src/main/resources/application.yml.example backend/src/main/resources/application.yml

# 프론트엔드 환경
cp frontend/.env.example frontend/.env.local
```

#### 3. Docker로 데이터베이스 시작
```bash
docker-compose up -d postgres redis
```

#### 4. 백엔드 설치 및 실행
```bash
cd backend
./gradlew build
./gradlew bootRun
```
백엔드는 http://localhost:8080 에서 접근 가능

#### 5. 프론트엔드 설치 및 실행
```bash
cd frontend
npm install
npm run dev
```
프론트엔드는 http://localhost:3000 에서 접근 가능

#### 6. Python ML 서비스 설정 (선택사항)
```bash
cd ml_scoring
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## ⚙️ 상세 설정

### 백엔드 설정

`backend/src/main/resources/application.yml` 편집:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/cryptodb
    username: cryptouser
    password: cryptopass
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
  
  redis:
    host: localhost
    port: 6379

jwt:
  secret: your-256-bit-secret-key-change-in-production
  access-token-validity-in-seconds: 900  # 15분
  refresh-token-validity-in-seconds: 604800  # 7일

binance:
  api:
    key: ${BINANCE_API_KEY}
    secret: ${BINANCE_SECRET_KEY}
    baseUrl: https://api.binance.com

encryption:
  key: your-32-character-encryption-key
```

### 프론트엔드 설정

`frontend/.env.local` 편집:

```bash
# API 설정
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# Google OAuth (선택사항)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# 기능 플래그
NEXT_PUBLIC_ENABLE_TRADING_BOT=false
NEXT_PUBLIC_ENABLE_BACKTESTING=false
```

### 데이터베이스 설정

Docker를 사용하지 않는 경우, 수동으로 데이터베이스 생성:

```sql
CREATE DATABASE cryptodb;
CREATE USER cryptouser WITH PASSWORD 'cryptopass';
GRANT ALL PRIVILEGES ON DATABASE cryptodb TO cryptouser;
```

### 🚀 빠른 시작 (Docker Compose)

모든 서비스를 한 번에 실행하려면:

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f
```

서비스 접근:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- ML Service: http://localhost:8001

### 💡 주요 사용 시나리오

#### 1. Binance 거래 자동 동기화
1. 설정 페이지에서 Binance API 키 등록
2. "동기화" 버튼 클릭하여 최근 24시간 거래 가져오기
3. 자동으로 포트폴리오 업데이트 및 손익 계산

#### 2. 거래 성과 분석
1. 대시보드에서 전체 포트폴리오 현황 확인
2. "분석" 탭에서 상세 통계 및 차트 확인
3. ML 점수를 통해 거래 개선점 파악

#### 3. 백테스팅 실행
1. 전략 선택 및 파라미터 설정
2. 과거 데이터 기간 선택
3. 백테스트 실행 및 결과 분석

### 🔑 인증 플로우 
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    
    U->>F: 로그인 요청
    F->>B: POST /api/auth/login
    B->>DB: 사용자 검증
    DB-->>B: 사용자 정보
    B-->>F: Access Token (15분) + Refresh Token (7일)
    F-->>U: 로그인 성공
    
    Note over F: 토큰 만료 시
    F->>B: POST /api/auth/refresh
    B-->>F: 새 Access Token

### 📱 API 사용 예제

```javascript
// 거래 조회
const response = await fetch('http://localhost:8080/api/trades', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const trades = await response.json();

// 새 거래 생성
const trade = {
  symbol: 'BTCUSDT',
  side: 'BUY',
  quantity: 0.001,
  price: 50000,
  tradingStrategy: 'TREND_FOLLOWING',
  entryTime: new Date().toISOString()
};

await fetch('http://localhost:8080/api/trades', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(trade)
});
```

## 📖 API 문서

### REST API 엔드포인트

| 메소드 | 엔드포인트 | 설명 |
|--------|----------|-------------|
| **인증** |
| POST | `/api/auth/register` | 새 사용자 등록 |
| POST | `/api/auth/login` | 사용자 로그인 |
| POST | `/api/auth/refresh` | 액세스 토큰 갱신 |
| GET | `/api/auth/me` | 현재 사용자 조회 |
| **거래** |
| GET | `/api/trades` | 거래 목록 조회 (페이지네이션) |
| GET | `/api/trades/{id}` | 거래 상세 조회 |
| POST | `/api/trades` | 거래 생성 |
| PUT | `/api/trades/{id}` | 거래 수정 |
| DELETE | `/api/trades/{id}` | 거래 삭제 |
| POST | `/api/trades/sync` | Binance와 동기화 |
| **포트폴리오** |
| GET | `/api/portfolio` | 포트폴리오 조회 |
| GET | `/api/portfolio/summary` | 포트폴리오 요약 조회 |
| PUT | `/api/portfolio/{symbol}/buy-price` | 평균 매수가 업데이트 |
| **통계** |
| GET | `/api/trades/statistics` | 거래 통계 조회 |
| GET | `/api/trades/statistics/time-heatmap` | 거래 시간 히트맵 조회 |

로컬 실행 시 전체 API 문서는 http://localhost:8080/swagger-ui.html 에서 확인 가능합니다.

### 🔧 개발 환경 설정

#### 추천 IDE 설정

**Backend (Java/Spring Boot)**:
- IntelliJ IDEA (추천) 또는 VS Code with Java Extension Pack
- Lombok 플러그인 설치 필수
- Spring Boot DevTools 자동 재시작 활성화

**Frontend (TypeScript/Next.js)**:
- VS Code with ESLint, Prettier 확장
- Auto-save 및 format on save 활성화

**Python (ML Services)**:
- PyCharm 또는 VS Code with Python Extension
- Black formatter 설정

### 📁 프로젝트 구조

```
coin_trading_journal/
├── frontend/                 # Next.js 프론트엔드 애플리케이션
│   ├── src/
│   │   ├── app/            # App router 페이지
│   │   ├── components/     # React 컴포넌트
│   │   ├── hooks/          # 커스텀 React hooks
│   │   ├── lib/           # 유틸리티 및 API 클라이언트
│   │   └── types/         # TypeScript 타입 정의
│   └── public/            # 정적 자산
│
├── backend/                 # Spring Boot 백엔드 애플리케이션
│   └── src/main/java/com/example/trading_bot/
│       ├── auth/          # 인증 및 JWT
│       ├── trade/         # 거래 관리
│       ├── portfolio/     # 포트폴리오 관리
│       ├── binance/       # Binance API 통합
│       └── common/        # 공유 유틸리티
│
├── ml_scoring/             # Python ML 스코어링 서비스
│   ├── app/              # FastAPI 애플리케이션
│   ├── ml/               # ML 모델 및 학습
│   └── tests/            # 단위 테스트
│
├── trading-engine/         # 자동매매 엔진
│   └── fastapi/          # 트레이딩 봇 API
│
└── nautilus-ml-pipeline/   # 백테스팅 프레임워크
    └── strategies/       # 거래 전략
```

### 🔄 개발 워크플로우

1. **기능 브랜치 생성**
```bash
git checkout -b feature/your-feature-name
```

2. **변경사항 작성 및 로컬 테스트**
```bash
# 백엔드 테스트 실행
cd backend && ./gradlew test

# 프론트엔드 테스트 실행
cd frontend && npm test
```

3. **변경사항 커밋**
```bash
git add .
git commit -m "feat: 새 기능 추가"
```

4. **푸시 및 PR 생성**
```bash
git push origin feature/your-feature-name
```

### 코드 스타일

- **Java**: Google Java Style Guide
- **TypeScript/JavaScript**: ESLint + Prettier 설정
- **Python**: Black formatter + isort

커밋 전 포매터 실행:
```bash
# 프론트엔드
npm run lint:fix
npm run prettier:fix

# 백엔드
./gradlew spotlessApply

# Python
black . && isort .
```

## 🧪 테스트

### 백엔드 테스트
```bash
cd backend
./gradlew test                 # 단위 테스트
./gradlew integrationTest      # 통합 테스트
./gradlew jacocoTestReport     # 커버리지 리포트
```

### 프론트엔드 테스트
```bash
cd frontend
npm test                       # 단위 테스트
npm run test:e2e              # E2E 테스트 (Playwright)
npm run test:coverage         # 커버리지 리포트
```

### ML 서비스 테스트
```bash
cd ml_scoring
pytest                        # 모든 테스트
pytest --cov=app             # 커버리지 포함
```

## 🌐 배포

### 🚀 자동 배포 (CI/CD)

#### GitHub Actions 워크플로우

`main` 브랜치에 푸시하면 자동으로:

1. **테스트 실행**: 단위 테스트 및 통합 테스트
2. **빌드**: Docker 이미지 빌드
3. **배포**:
   - Frontend → Vercel
   - Backend → Railway
   - ML Services → Railway (선택사항)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend && ./gradlew test
          cd ../frontend && npm test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
      - name: Deploy to Railway
        uses: berviantoleo/railway-deploy@main
```

### 수동 배포

#### Vercel로 프론트엔드 배포
```bash
cd frontend
npm run build
vercel --prod
```

#### Railway로 백엔드 배포
```bash
railway up
```

### 프로덕션 환경 변수

배포 플랫폼에 다음 환경 변수 설정 필요:

**백엔드 (Railway)**:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `BINANCE_API_KEY`
- `BINANCE_SECRET_KEY`
- `ENCRYPTION_KEY`

**프론트엔드 (Vercel)**:
- `NEXT_PUBLIC_API_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

## 🐛 문제 해결

### ❗ 자주 발생하는 문제와 해결법

#### 백엔드가 시작되지 않음
- Java 버전 확인: `java -version` (17+ 필요)
- `application.yml`의 데이터베이스 연결 확인
- PostgreSQL과 Redis가 실행 중인지 확인

#### 프론트엔드 빌드 오류
```bash
rm -rf node_modules .next
npm install
npm run build
```

#### 데이터베이스 연결 문제
- PostgreSQL 실행 확인: `docker ps`
- `application.yml`의 인증 정보 확인
- 수동 연결 시도: `psql -h localhost -U cryptouser -d cryptodb`

#### JWT 토큰 문제
- 브라우저 localStorage 삭제
- 백엔드 설정의 토큰 만료 설정 확인
- 배포 환경 간 JWT secret 일치 여부 확인

#### Binance API 오류
- Binance의 API 키 권한 확인
- IP 화이트리스트 설정 확인
- 환경 변수에 API 키/시크릿이 올바르게 설정되었는지 확인

### 로깅

- **백엔드 로그**: 콘솔 출력 또는 `logs/application.log` 확인
- **프론트엔드 로그**: 브라우저 콘솔 및 Vercel 함수 로그
- **데이터베이스 쿼리**: `application.yml`에서 `show-sql: true` 활성화

## 🤝 기여하기

기여를 환영합니다! 다음 가이드라인을 따라주세요:

1. 저장소 포크
2. 기능 브랜치 생성
3. 적절한 테스트와 함께 변경사항 작성
4. 모든 테스트 통과 확인
5. Pull Request 제출

### 커밋 메시지 규칙

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 업데이트
style: 코드 포맷
refactor: 코드 리팩토링
test: 테스트 추가
chore: 의존성 업데이트
```

### 🏷️ 버전 관리

[Semantic Versioning](https://semver.org/)을 따릅니다:
- MAJOR: 호환되지 않는 API 변경
- MINOR: 하위 호환 기능 추가
- PATCH: 하위 호환 버그 수정

### 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

### 📞 연락처 & 커뮤니티

- **버그 리포트**: [GitHub Issues](https://github.com/seolwon0522/coin_trading_journal/issues)
- **기능 제안**: [GitHub Discussions](https://github.com/seolwon0522/coin_trading_journal/discussions)
- **이메일**: support@cryptojournal.com

### 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움으로 만들어졌습니다:

- [Binance API](https://binance-docs.github.io/apidocs/) - 실시간 시장 데이터
- [Nautilus Trader](https://nautilustrader.io/) - 고성능 백테스팅
- [shadcn/ui](https://ui.shadcn.com/) - 모던 UI 컴포넌트
- [Spring Boot](https://spring.io/) - 엔터프라이즈급 백엔드
- [Next.js](https://nextjs.org/) - 풀스택 React 프레임워크

---

<div align="center">
  <strong>🚀 Happy Trading! 🚀</strong>
  <br>
  <sub>Built with ❤️ by the Crypto Journal Team</sub>
</div>