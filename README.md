# 🪙 Crypto Trading Journal

차트 감시, 거래 기록, 자동매매 전략 운영을 한 곳에서 처리할 수 있도록 설계된 통합 암호화폐 트레이딩 저널입니다. Spring Boot 백엔드와 Next.js 프론트엔드, FastAPI 기반 Nautilus Trader 서비스가 하나의 모노레포로 구성되어 있으며, PostgreSQL·Redis·Prometheus·Grafana 등 운영 인프라까지 함께 관리합니다.

## 📦 모노레포 구성 요소

| 디렉터리 | 설명 |
| --- | --- |
| `frontend/` | Next.js 15(App Router) + React 19 기반 트레이딩 대시보드. 타입 안정성을 위해 TypeScript·Zod·TanStack Query를 사용하며 shadcn/ui + Tailwind CSS 4로 UI를 구성합니다. [`package.json`](frontend/package.json) |
| `backend/` | Spring Boot 3.5.4(Java 17) REST API. JWT·OAuth2 인증, PostgreSQL/Redis 연동, Binance API, Swagger 문서를 제공합니다. [`build.gradle`](backend/build.gradle) |
| `nautilus-service/` | FastAPI + Nautilus Trader 1.220.0 기반 자동매매/백테스팅 엔진. 여러 전략과 WebSocket 브로드캐스터를 포함합니다. [`requirements.txt`](nautilus-service/requirements.txt) |
| `docker-compose.yml` | PostgreSQL, Redis, Backend, Frontend, Nautilus, Prometheus, Grafana, Nginx(옵션)까지 묶어 실행하는 오케스트레이션 구성. |
| `.github/workflows/` | 백엔드/프론트엔드 CI와 배포 트리거 GitHub Actions. [`backend-ci.yml`](.github/workflows/backend-ci.yml), [`frontend-ci.yml`](.github/workflows/frontend-ci.yml), [`deploy.yml`](.github/workflows/deploy.yml) |
| 기타 문서 | `CURRENT_STATUS.md`, `NAUTILUS_INTEGRATION_PLAN.md`, `openapi.yaml` 등 진행 현황·통합 계획·인증 API 사양 문서. |

## 🏗️ 시스템 아키텍처

```
┌──────────────────────────┐    ┌──────────────────────────┐
│      Frontend (Next.js)  │ ◀─▶│   Backend (Spring Boot)   │
│ React 19 · Tailwind CSS  │    │  REST / JWT / OAuth2      │
└─────────────┬────────────┘    └─────────────┬────────────┘
              │ REST / WebSocket               │
              │                                 │ gRPC 계획, REST 브릿지
              ▼                                 ▼
      ┌────────────────┐               ┌──────────────────────┐
      │ PostgreSQL 15  │               │ Nautilus Trader      │
      │ 거래·포트폴리오│               │ FastAPI · 전략 엔진  │
      └────────────────┘               └──────────┬───────────┘
                                                  │
                                       Binance REST/WebSocket
                                                  │
                          Prometheus & Grafana (모니터링, docker-compose)
```

### ⚙️ 핵심 기술 스택
- **프론트엔드**: Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, TanStack Query 5, React Hook Form, Chart.js/Recharts, Turbopack 개발 서버. [`package.json`](frontend/package.json)
- **백엔드**: Spring Boot 3.5.4, Spring Security, Spring Data JPA, Spring WebFlux(WebClient), Redis, PostgreSQL, JWT(JJJWT), Swagger(springdoc), Actuator. [`build.gradle`](backend/build.gradle)
- **트레이딩 서비스**: FastAPI, Pydantic Settings, Nautilus Trader 1.220.0, python-binance, ccxt, SQLAlchemy, Redis, Prometheus client, pytest. [`requirements.txt`](nautilus-service/requirements.txt)
- **인프라/DevOps**: Docker Compose, Railway 배포(`railway.json`), Procfile(백엔드), GitHub Actions CI/CD, Prometheus & Grafana 모니터링, Nginx 리버스 프록시. [`docker-compose.yml`](docker-compose.yml), [`Procfile`](Procfile)

## ✨ 주요 기능

### 거래·포트폴리오 관리 (Backend + Frontend)
- 인증된 사용자 전용 거래 CRUD 및 페이지네이션 제공. [`TradeController`](backend/src/main/java/com/example/trading_bot/trade/controller/TradeController.java)
- Binance API 키 등록, 실시간 동기화, 포트폴리오 집계, 전략 분류, 통계 API 등 도메인 패키지 분리. [`trade`, `portfolio`, `strategy`, `binance`](backend/src/main/java/com/example/trading_bot)
- Next.js 대시보드에서 최근 거래, 전략 상태, 포트폴리오 요약을 UI 카드로 시각화. [`dashboard/page.tsx`](frontend/src/app/dashboard/page.tsx)

### 인증·보안
- 이메일 기반 회원가입/로그인 + JWT Access/Refresh 토큰 발급 및 만료 관리. [`AuthController`](backend/src/main/java/com/example/trading_bot/auth/controller/AuthController.java)
- Google 등 OAuth2 소셜 로그인 엔드포인트, BCrypt 암호화, RBAC를 제공하는 Spring Security 구성. [`SecurityConfig`](backend/src/main/java/com/example/trading_bot/auth/config/SecurityConfig.java)
- CORS, JWT 필터, 예외 처리, 감사 로그(JPA Auditing) 등 운영 안전장치 기본 제공. [`CorsConfig`](backend/src/main/java/com/example/trading_bot/config/CorsConfig.java)

### 자동매매 & 전략 엔진 (Nautilus Service)
- FastAPI + NodeManager가 Nautilus Trader 노드를 기동/중지하고 전략을 동적으로 등록. [`app/main.py`](nautilus-service/app/main.py)
- RSI, EMA Cross, Momentum, Bollinger Bands, Grid Trading 등 샘플 전략을 제공하는 팩토리. [`app/strategies`](nautilus-service/app/strategies)
- WebSocket 구독/브로드캐스트 매니저로 실시간 시그널·상태를 전송. [`websocket/manager.py`](nautilus-service/app/websocket/manager.py)
- 내부 `/internal/strategy/*` 엔드포인트로 Spring 백엔드와 연동할 수 있는 브릿지 API 제공. [`app/main.py`](nautilus-service/app/main.py)

### 운영 도구·모니터링
- Docker Compose로 PostgreSQL·Redis·백엔드·프론트엔드·Nautilus·Prometheus·Grafana를 한번에 실행. [`docker-compose.yml`](docker-compose.yml)
- Prometheus/Grafana 프로파일은 `monitoring/` 경로를 마운트하도록 되어 있으므로 실제 실행 시 해당 디렉터리에 대시보드·데이터소스 설정 파일을 준비해야 합니다. [`docker-compose.yml`](docker-compose.yml)
- GitHub Actions로 백엔드/프론트엔드 테스트 → 배포 알림 순서의 워크플로 구성. [`deploy.yml`](.github/workflows/deploy.yml)

## 📁 디렉터리 구조 (상위)

```
coin_trading_journal/
├── backend/                # Spring Boot API 서버
├── frontend/               # Next.js 대시보드
├── nautilus-service/       # FastAPI + Nautilus Trader 엔진
├── docker-compose.yml      # 전체 스택 실행 스크립트
├── .github/workflows/      # CI/CD 파이프라인
├── CURRENT_STATUS.md       # 현재 진행 상황 리포트
├── NAUTILUS_INTEGRATION_PLAN.md
├── openapi.yaml            # 인증 API OpenAPI 사양
└── .env.example            # 환경 변수 템플릿
```

## 🚀 빠른 시작

### 0. 필수 요구사항
- Node.js 18 이상 (LTS 20 권장) & npm. [`frontend/package.json`](frontend/package.json)
- Java 17 (Gradle 8 포함). [`backend/build.gradle`](backend/build.gradle)
- Python 3.11 이상. [`requirements.txt`](nautilus-service/requirements.txt)
- Docker & Docker Compose (선택).
- PostgreSQL 15, Redis 7 (로컬 설치 또는 Docker 사용). [`docker-compose.yml`](docker-compose.yml)

### 1. 저장소 클론
```bash
git clone https://github.com/<your-org>/coin_trading_journal.git
cd coin_trading_journal
```

### 2. 환경 변수 구성
1. 루트 `.env` 생성
   ```bash
   cp .env.example .env
   ```
   필요한 키(BINANCE, JWT, Grafana 등)를 채웁니다. [`.env.example`](.env.example)
2. 백엔드 DB 정보는 `backend/src/main/resources/application.yaml`에서 수정하거나 환경변수로 덮어쓸 수 있습니다. [`application.yaml`](backend/src/main/resources/application.yaml)
3. 프론트엔드 `.env.local`이 필요한 경우 `frontend/.env.local`을 만들어 `NEXT_PUBLIC_API_URL` 등 값을 입력합니다. [`docker-compose.yml`](docker-compose.yml)

### 3. Docker Compose로 전체 스택 실행 (권장)
```bash
docker compose up -d postgres redis
# 필요 시 전체 서비스 기동
docker compose up -d

# 상태 확인
docker compose ps
# 로그 추적
docker compose logs -f backend
```
- 기본 포트: Frontend `http://localhost:3000`, Backend `http://localhost:8080`, Nautilus `http://localhost:8002`, Grafana `http://localhost:3001`(프록시) / `http://localhost:9090`(Prometheus). [`docker-compose.yml`](docker-compose.yml)
- 모니터링 기능을 사용하려면 `monitoring/grafana`와 `monitoring/prometheus.yml`을 사전에 준비하세요.

### 4. 로컬 개발 모드 (개별 실행)

#### Backend (Spring Boot)
```bash
cd backend
./gradlew bootRun
```
- 기본 프로필은 `application.yaml` 설정을 사용하며, `SPRING_PROFILES_ACTIVE`로 `dev`, `local`, `prod`를 전환할 수 있습니다. [`application.yaml`](backend/src/main/resources/application.yaml)
- 애플리케이션은 `http://localhost:8080`에서 동작하고 Swagger UI는 `/swagger-ui/index.html`입니다.

#### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
- Turbopack 개발 서버가 `http://localhost:3000`에서 실행됩니다. [`package.json`](frontend/package.json)
- API 클라이언트는 `/api` 경로를 통해 백엔드 JWT 인증을 사용합니다. [`frontend/src/lib/api`](frontend/src/lib/api)

#### Nautilus Trading Service (FastAPI)
```bash
cd nautilus-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```
- `/docs`(Swagger), `/internal/strategy/*`, `/ws/trading` WebSocket 엔드포인트를 제공합니다. [`app/main.py`](nautilus-service/app/main.py)
- Binance Testnet을 사용할 경우 `.env` 또는 실행 환경 변수로 API 키를 주입하세요. [`requirements.txt`](nautilus-service/requirements.txt)

## 🔑 환경 변수 요약
주요 환경 변수는 `.env.example`에 정리되어 있으며 아래 그룹으로 구분됩니다. [`.env.example`](.env.example)

| 그룹 | 예시 |
| --- | --- |
| 데이터베이스/캐시 | `DB_HOST`, `DB_USER`, `REDIS_HOST` |
| 인증·보안 | `JWT_SECRET`, `API_KEY`, `ENABLE_2FA` |
| Binance | `BINANCE_API_KEY`, `BINANCE_TESTNET` |
| Nautilus | `NAUTILUS_SERVICE_URL`, `MAX_STRATEGIES` |
| Frontend | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` |
| 모니터링 | `GRAFANA_USER`, `PROMETHEUS_RETENTION_TIME` |
| 기타 | `ENABLE_BACKTESTING`, `RATE_LIMIT_*`, `SMTP_*`, `TELEGRAM_*` |

## 🧪 개발 스크립트 & 테스트

### Backend
- 단위 테스트: `./gradlew test`
- 빌드 (테스트 제외): `./gradlew build -x test`
- 실행: `./gradlew bootRun`
GitHub Actions는 PostgreSQL을 붙여 테스트 후 빌드를 수행합니다. [`backend-ci.yml`](.github/workflows/backend-ci.yml)

### Frontend
- 린트: `npm run lint`
- 타입 검사: `npm run type-check`
- 단위 테스트: `npm test -- --passWithNoTests`
- 프로덕션 빌드: `npm run build`
GitHub Actions가 위 스크립트를 순차 실행합니다. [`frontend-ci.yml`](.github/workflows/frontend-ci.yml)

### Nautilus Service
- 형식/정적 분석: `black`, `pylint`, `mypy` (requirements에 포함)
- 테스트: `pytest` / `pytest-asyncio`를 이용한 비동기 테스트 (`nautilus-service/tests`). [`requirements.txt`](nautilus-service/requirements.txt)

## 📚 API 문서 & 참고 자료
- 백엔드 Swagger UI: `http://localhost:8080/swagger-ui/index.html`
- OpenAPI 명세: `openapi.yaml` (인증/보안 API 정의). [`openapi.yaml`](openapi.yaml)
- Nautilus FastAPI 문서: `http://localhost:8002/docs`
- 현재 진행 상황: `CURRENT_STATUS.md`
- Nautilus 통합 로드맵: `NAUTILUS_INTEGRATION_PLAN.md`

## 🚢 배포 가이드
- **Railway**: `railway.json`과 `Procfile`이 Dockerfile 기반 배포 및 헬스체크 경로(`/actuator/health`)를 정의합니다. [`railway.json`](railway.json), [`Procfile`](Procfile)
- **Vercel**: 프론트엔드 Dockerfile(`frontend/Dockerfile`)을 사용하거나 Vercel 통합으로 자동 빌드 (`deploy.yml` 참고).
- **Docker 단일 서비스**: 각 디렉터리별 `Dockerfile` 존재(`backend`, `frontend`, `nautilus-service`). `docker compose build`로 일괄 빌드 가능합니다.
- **CI/CD**: `deploy.yml`이 메인 브랜치 푸시 시 백엔드/프론트엔드 테스트를 재사용하고, 모든 테스트 성공 후 Railway/Vercel 배포를 트리거합니다. [`deploy.yml`](.github/workflows/deploy.yml)

## 🩺 문제 해결 체크리스트
- **백엔드 기동 실패**: Java 17 확인, `application.yaml` DB URL 점검, PostgreSQL/Redis가 실행 중인지 확인. [`application.yaml`](backend/src/main/resources/application.yaml)
- **프론트엔드 API 401**: 브라우저 저장된 토큰 삭제 후 다시 로그인, `NEXT_PUBLIC_API_URL`이 백엔드 주소와 일치하는지 확인.
- **Nautilus 전략 미기동**: `.env`에 Binance 키가 설정됐는지 확인하고 `/internal/strategy/status/{id}`로 상태 조회. [`app/main.py`](nautilus-service/app/main.py)
- **Docker Compose 모니터링 오류**: `monitoring/` 디렉터리가 비어 있으면 Grafana/Prometheus 컨테이너가 실패할 수 있습니다. 필요한 설정 파일을 추가하세요. [`docker-compose.yml`](docker-compose.yml)

## 🤝 기여 가이드
1. 이슈 등록으로 버그/개선 제안.
2. 기능 브랜치 생성 후 변경 사항 적용.
3. 백엔드/프론트엔드 테스트 및 린트를 통과시킨 뒤 PR 제출.
4. PR 설명에 실행한 테스트와 영향 범위를 명시해주세요.

## 📜 라이선스
현재 저장소에는 명시적인 라이선스 파일이 포함되어 있지 않습니다. 배포 전에 프로젝트에 적용할 라이선스를 추가해 주세요.

## 📬 연락 및 참고
- 지원/문의: `support@cryptojournal.com` (예시)
- Binance Testnet 신청: [https://testnet.binance.vision/](https://testnet.binance.vision/)
- Nautilus Trader 공식 문서: [https://nautilustrader.io/docs/](https://nautilustrader.io/docs/)

Happy Trading!
