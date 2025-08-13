# 🚀 코인 거래 저널 - 통합 모노레포

> **AI 기반 암호화폐 거래 분석 및 성과 관리 플랫폼**  
> Next.js + Spring Boot + FastAPI로 구성된 풀스택 모노레포 시스템

[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black?logo=next.js)](https://nextjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-brightgreen?logo=spring)](https://spring.io/projects/spring-boot)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Java](https://img.shields.io/badge/Java-17-orange?logo=openjdk)](https://openjdk.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-yellow?logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://www.postgresql.org/)

---

## 📋 목차

- [🎯 프로젝트 소개](#-프로젝트-소개)
- [🏗️ 시스템 아키텍처](#️-시스템-아키텍처)
- [🛠️ 기술 스택](#️-기술-스택)
- [📁 프로젝트 구조](#-프로젝트-구조)
- [🚀 빠른 시작](#-빠른-시작)
- [⚙️ 개발 환경 설정](#️-개발-환경-설정)
- [🐳 Docker 실행](#-docker-실행)
- [📖 API 문서](#-api-문서)
- [✨ 주요 기능](#-주요-기능)
- [🔧 개발 가이드](#-개발-가이드)
- [📊 개발 현황](#-개발-현황)

---

## 🎯 프로젝트 소개

**코인 거래 저널**은 암호화폐 트레이더를 위한 종합적인 거래 분석 및 성과 관리 플랫폼입니다. 실시간 거래 데이터 분석, AI 기반 패턴 인사이트, 그리고 체계적인 성과 추적을 통해 트레이더의 의사결정을 지원합니다.

### 🎯 핵심 가치

- **📊 체계적인 거래 기록 관리**: 수동 거래 입력부터 자동 분석까지
- **🤖 AI 기반 패턴 분석**: GPT-4를 활용한 주간 거래 패턴 분석
- **📈 실시간 성과 추적**: 수익률, 승률, 시간대별 분석
- **🔄 통합 워크플로우**: 하나의 플랫폼에서 모든 거래 관리

---

## 🏗️ 시스템 아키텍처

```mermaid
graph TB
    subgraph "사용자 인터페이스"
        UI[프론트엔드<br/>Next.js 15 + TypeScript]
    end
    
    subgraph "비즈니스 로직"
        API[메인 백엔드<br/>Spring Boot 3.5.4]
        ENGINE[매매평가 엔진<br/>FastAPI + Python]
    end
    
    subgraph "데이터 계층"
        DB[(PostgreSQL<br/>메인 데이터베이스)]
        REDIS[(Redis<br/>캐싱 & 세션)]
    end
    
    subgraph "외부 서비스"
        BINANCE[Binance API<br/>실시간 가격]
        GPT[OpenAI GPT-4<br/>패턴 분석]
    end
    
    UI --> API
    UI --> ENGINE
    API --> DB
    ENGINE --> DB
    API --> REDIS
    ENGINE --> REDIS
    ENGINE --> GPT
    API --> BINANCE
    
    style UI fill:#e1f5fe
    style API fill:#e8f5e8
    style ENGINE fill:#fff3e0
    style DB fill:#f3e5f5
    style REDIS fill:#ffebee
```

### 🔄 데이터 플로우

1. **프론트엔드 (포트: 3000)**: 사용자 인터페이스, 차트, 대시보드
2. **메인 백엔드 (포트: 8080)**: 사용자 인증, 거래 CRUD, 비즈니스 로직
3. **매매평가 엔진 (포트: 8000)**: 거래 스코어링, AI 분석, 패턴 인사이트
4. **데이터베이스**: PostgreSQL (메인), Redis (캐싱)

---

## 🛠️ 기술 스택

### 🌐 프론트엔드 (`frontend/`)

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 15.4.5 | React 풀스택 프레임워크 |
| **TypeScript** | 5.0+ | 타입 안전성 |
| **Tailwind CSS** | 4.0+ | 유틸리티 기반 CSS 프레임워크 |
| **React Query** | 5.84.1 | 서버 상태 관리 |
| **React Hook Form** | 7.62.0 | 폼 관리 및 검증 |
| **Recharts** | 2.15.4 | 차트 및 데이터 시각화 |
| **Zod** | 4.0.14 | 스키마 검증 |
| **Next Themes** | 0.4.6 | 다크모드 지원 |

### 🏗️ 메인 백엔드 (`backend/`)

| 기술 | 버전 | 용도 |
|------|------|------|
| **Java** | 17 | 메인 프로그래밍 언어 |
| **Spring Boot** | 3.5.4 | 백엔드 프레임워크 |
| **Spring Security** | 6.0+ | 인증 및 보안 |
| **Spring Data JPA** | - | 데이터베이스 ORM |
| **JWT** | 0.12.3 | 토큰 기반 인증 |
| **PostgreSQL** | 15+ | 메인 데이터베이스 |
| **Swagger/OpenAPI** | 2.3.0 | API 문서화 |
| **Lombok** | - | 코드 간소화 |

### 🐍 매매평가 엔진 (`trading-engine/`)

| 기술 | 버전 | 용도 |
|------|------|------|
| **Python** | 3.9+ | 분석 및 알고리즘 언어 |
| **FastAPI** | 0.104.1 | 고성능 API 프레임워크 |
| **SQLAlchemy** | 2.0.23 | Python ORM |
| **Pandas** | 2.1.3 | 데이터 분석 |
| **OpenAI** | 1.3.5 | GPT-4 기반 패턴 분석 |
| **Pydantic** | 2.5.0 | 데이터 검증 |

### 🗄️ 데이터베이스 & 인프라

| 기술 | 버전 | 용도 |
|------|------|------|
| **PostgreSQL** | 15+ | 메인 데이터베이스 |
| **Redis** | 7.0+ | 캐싱 및 세션 스토어 |
| **Docker** | - | 컨테이너화 |
| **Nginx** | - | 리버스 프록시 |

---

## 📁 프로젝트 구조

```
coin-trading-journal-monorepo/
│
├── 📁 frontend/                    # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/                    # App Router 페이지
│   │   │   ├── trades/             # 거래 관리 페이지
│   │   │   ├── statistics/         # 통계 대시보드
│   │   │   ├── reports/            # 리포트 페이지
│   │   │   └── api/                # API Routes
│   │   ├── components/             # 재사용 컴포넌트
│   │   │   ├── trades/             # 거래 관련 컴포넌트
│   │   │   ├── statistics/         # 차트 및 통계 컴포넌트
│   │   │   ├── layout/             # 레이아웃 컴포넌트
│   │   │   └── ui/                 # 기본 UI 컴포넌트
│   │   ├── hooks/                  # 커스텀 훅
│   │   ├── lib/                    # 유틸리티 함수
│   │   └── types/                  # TypeScript 타입 정의
│   ├── package.json
│   └── Dockerfile
│
├── 📁 backend/                     # Spring Boot 메인 백엔드
│   ├── src/main/java/com/example/trading_bot/
│   │   ├── auth/                   # JWT + OAuth2 인증 시스템
│   │   │   ├── config/             # Security 설정
│   │   │   ├── controller/         # 인증 API
│   │   │   ├── dto/                # 요청/응답 DTO
│   │   │   ├── entity/             # 사용자/역할 엔티티
│   │   │   ├── jwt/                # JWT 토큰 처리
│   │   │   ├── repository/         # 데이터 접근 계층
│   │   │   └── service/            # 비즈니스 로직
│   │   ├── common/                 # 공통 컴포넌트
│   │   │   ├── dto/                # 공통 응답 DTO
│   │   │   ├── entity/             # 기본 엔티티
│   │   │   └── exception/          # 글로벌 예외 처리
│   │   ├── trading/                # 거래 관리 (개발 예정)
│   │   ├── analysis/               # 분석 시스템 (개발 예정)
│   │   └── TradingBotApplication.java
│   ├── src/main/resources/
│   │   └── application.yaml        # 설정 파일
│   ├── build.gradle
│   └── Dockerfile
│
├── 📁 trading-engine/              # Python 매매평가 엔진
│   ├── app/
│   │   ├── main.py                 # FastAPI 앱
│   │   ├── database.py             # DB 연결 설정
│   │   ├── schemas.py              # Pydantic 모델
│   │   ├── scoring.py              # 거래 스코어링 로직
│   │   ├── llm_analyzer.py         # GPT-4 패턴 분석
│   │   ├── routes_trades.py        # 거래 관련 API
│   │   ├── routes_patterns.py      # 패턴 분석 API
│   │   └── requirements.txt
│   └── Dockerfile
│
├── 📁 nginx/                       # Nginx 설정 (프로덕션)
├── 📄 docker-compose.yml           # 프로덕션 컨테이너 설정
├── 📄 docker-compose.dev.yml       # 개발 환경 설정
├── 📄 package.json                 # 모노레포 루트 설정
└── 📄 README.md                    # 이 파일
```

---

## 🚀 빠른 시작

### 📋 사전 요구사항

- **Node.js**: 18.0.0 이상
- **Java**: 17 이상 (OpenJDK 권장)
- **Python**: 3.9 이상
- **PostgreSQL**: 15 이상
- **Redis**: 7.0 이상 (선택사항)

### ⚡ 1분 시작하기

```bash
# 1. 프로젝트 클론
git clone <repository-url>
cd coin-trading-journal-monorepo

# 2. 모든 의존성 설치
npm run install:all

# 3. 데이터베이스 설정 (PostgreSQL 실행 후)
psql -U postgres -c "CREATE DATABASE trading_journal;"

# 4. 환경 변수 설정
cp env.example .env.local

# 5. 전체 시스템 실행
npm run dev:all
```

### 🌐 접속 확인

- **프론트엔드**: http://localhost:3000
- **메인 백엔드**: http://localhost:8080 (Swagger: `/swagger-ui.html`)
- **매매평가 엔진**: http://localhost:8000 (Docs: `/docs`)

---

## ⚙️ 개발 환경 설정

### 1️⃣ 데이터베이스 설정

#### PostgreSQL 설치 및 설정

```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# 데이터베이스 생성
psql -U postgres
CREATE DATABASE trading_journal ENCODING 'UTF8';
CREATE USER trading_user WITH PASSWORD 'trading_password';
GRANT ALL PRIVILEGES ON DATABASE trading_journal TO trading_user;
\q
```

#### Redis 설치 (선택사항)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo service redis-server start
```

### 2️⃣ 환경 변수 설정

#### 전역 환경 변수 (.env.local)

```bash
# 데이터베이스
DATABASE_URL=postgresql://trading_user:trading_password@localhost:5432/trading_journal
REDIS_URL=redis://localhost:6379

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_TRADING_ENGINE_URL=http://localhost:8000

# JWT 비밀키
JWT_SECRET=your-super-secret-jwt-key-minimum-256-bits-long

# OpenAI API (패턴 분석용)
OPENAI_API_KEY=your-openai-api-key

# OAuth2 (선택사항)
GOOGLE_CLIENT_ID=your-google-client-id
APPLE_CLIENT_ID=your-apple-client-id
```

### 3️⃣ 개별 모듈 실행

#### 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# 접속: http://localhost:3000
```

#### 메인 백엔드 실행

```bash
cd backend
./gradlew bootRun
# 접속: http://localhost:8080
# Swagger: http://localhost:8080/swagger-ui.html
```

#### 매매평가 엔진 실행

```bash
cd trading-engine/app
pip install -r requirements.txt
export DATABASE_URL="postgresql://trading_user:trading_password@localhost:5432/trading_journal"
export OPENAI_API_KEY="your-openai-api-key"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# 접속: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 🐳 Docker 실행

### 🚀 전체 시스템 실행 (프로덕션)

```bash
# 전체 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 접속 확인
curl http://localhost:3000  # 프론트엔드
curl http://localhost:8080/actuator/health  # 백엔드
curl http://localhost:8000/health  # 매매평가 엔진
```

### 🔧 개발 모드 실행

```bash
# 개발 환경 (핫 리로드 활성화)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 특정 서비스만 실행
docker-compose up postgres redis  # 데이터베이스만
```

### 📊 서비스 상태 확인

```bash
# 모든 서비스 상태
docker-compose ps

# 개별 서비스 로그
docker-compose logs frontend
docker-compose logs backend
docker-compose logs trading-engine
```

---

## 📖 API 문서

### 🌐 Swagger UI

각 백엔드 서비스는 자동으로 생성되는 API 문서를 제공합니다:

- **메인 백엔드**: http://localhost:8080/swagger-ui.html
- **매매평가 엔진**: http://localhost:8000/docs

### 🔑 주요 API 엔드포인트

#### 메인 백엔드 (Spring Boot) - 포트 8080

```http
# 인증 API
POST   /api/v1/auth/register      # 회원가입
POST   /api/v1/auth/login         # 로그인
POST   /api/v1/auth/refresh       # 토큰 갱신
POST   /api/v1/auth/logout        # 로그아웃
GET    /api/v1/auth/oauth2/google # Google OAuth2

# 사용자 관리 API (개발 예정)
GET    /api/v1/users/profile      # 사용자 프로필
PUT    /api/v1/users/profile      # 프로필 업데이트

# 거래 관리 API (개발 예정)
GET    /api/v1/trades             # 거래 목록
POST   /api/v1/trades             # 거래 생성
PUT    /api/v1/trades/{id}        # 거래 수정
DELETE /api/v1/trades/{id}        # 거래 삭제
```

#### 매매평가 엔진 (FastAPI) - 포트 8000

```http
# 시스템 API
GET    /                          # 서버 상태
GET    /health                    # 헬스 체크

# 거래 스코어링 API
POST   /trades                    # 거래 생성 (자동 스코어링)
GET    /trades                    # 거래 목록
GET    /trades/{trade_id}         # 거래 상세
PUT    /trades/{trade_id}         # 거래 수정
DELETE /trades/{trade_id}         # 거래 삭제

# AI 패턴 분석 API
POST   /patterns/weekly/analyze   # 주간 패턴 분석 (GPT-4)
GET    /patterns/history          # 분석 히스토리
GET    /patterns/{pattern_id}     # 패턴 상세

# 통계 API
GET    /analytics/summary         # 거래 요약 통계
GET    /analytics/performance     # 성과 분석
GET    /analytics/trends          # 트렌드 분석
```

### 📝 API 사용 예시

#### 거래 등록 및 스코어링

```bash
curl -X POST "http://localhost:8000/trades" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "coin": "BTC",
    "type": "BUY",
    "quantity": 0.1,
    "price": 45000,
    "timestamp": "2024-01-15T10:30:00"
  }'
```

#### 주간 패턴 분석

```bash
curl -X POST "http://localhost:8000/patterns/weekly/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "start": "2024-01-01",
    "end": "2024-01-07"
  }'
```

---

## ✨ 주요 기능

### 🎯 1. 거래 기록 관리

- **📝 거래 등록**: 수동 거래 기록 입력
- **📊 자동 스코어링**: AI 기반 거래 품질 평가
- **🏷️ 태그 시스템**: 거래 분류 및 관리
- **📝 메모 기능**: 거래 시 의사결정 기록

### 📈 2. 실시간 대시보드

- **💰 수익률 추적**: 일/주/월별 수익률 차트
- **🎯 승률 분석**: 성공/실패 거래 비율
- **⏰ 시간대별 분석**: 거래 시간 패턴 히트맵
- **📊 코인별 성과**: 종목별 수익률 비교

### 🤖 3. AI 패턴 분석

- **🧠 GPT-4 분석**: 주간 거래 패턴 AI 인사이트
- **📉 손실 패턴 탐지**: 반복되는 손실 패턴 식별
- **💡 개선 제안**: 맞춤형 거래 전략 조언
- **📈 성과 예측**: 과거 데이터 기반 성과 예측

### 🔄 4. 통합 워크플로우

- **🔐 안전한 인증**: JWT + OAuth2 기반 보안
- **📱 반응형 UI**: 모바일/데스크톱 최적화
- **🌙 다크모드**: 사용자 선호도 지원
- **⚡ 실시간 업데이트**: WebSocket 기반 실시간 데이터

---

## 🔧 개발 가이드

### 📝 코딩 컨벤션

#### TypeScript/React

```typescript
// ✅ Good
interface TradeFormProps {
  onSubmit: (trade: Trade) => void;
  initialValues?: Partial<Trade>;
  isLoading?: boolean;
}

export const TradeForm: FC<TradeFormProps> = ({
  onSubmit,
  initialValues,
  isLoading = false
}) => {
  // 컴포넌트 구현
};
```

#### Java/Spring Boot

```java
// ✅ Good
@Service
@RequiredArgsConstructor
@Slf4j
public class TradingService {
    
    private final TradingRepository tradingRepository;
    private final UserService userService;
    
    @Transactional(readOnly = true)
    public List<TradeDto> findTradesByUserId(String userId) {
        return tradingRepository.findByUserId(userId)
            .stream()
            .map(this::convertToDto)
            .collect(toList());
    }
}
```

#### Python/FastAPI

```python
# ✅ Good
@router.post("/trades", response_model=TradeResponse)
async def create_trade(
    trade: TradeCreate,
    db: Session = Depends(get_db)
) -> TradeResponse:
    """거래 생성 및 자동 스코어링"""
    try:
        # 비즈니스 로직
        scoring_result = await calculate_trade_score(trade)
        db_trade = await create_trade_in_db(db, trade, scoring_result)
        
        return TradeResponse.from_orm(db_trade)
    except Exception as e:
        logger.error(f"거래 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="거래 생성에 실패했습니다")
```

### 🔄 Git 워크플로우

```bash
# 브랜치 명명 규칙
feature/auth-oauth2-integration
fix/trading-score-calculation
hotfix/security-vulnerability

# 커밋 메시지 규칙
feat(auth): Google OAuth2 로그인 기능 추가
fix(trading): 수수료 계산 오류 수정
docs(readme): API 엔드포인트 문서 업데이트
test(frontend): 거래 폼 컴포넌트 테스트 추가
```

### 🧪 테스트 실행

```bash
# 프론트엔드 테스트
cd frontend
npm run test              # Jest 단위 테스트
npm run test:e2e          # Playwright E2E 테스트

# 백엔드 테스트
cd backend
./gradlew test            # JUnit 테스트
./gradlew integrationTest # 통합 테스트

# 매매평가 엔진 테스트
cd trading-engine/app
pytest                    # Python 테스트
pytest --cov=.           # 커버리지 리포트
```

---

## 📊 개발 현황

### ✅ 완료된 기능

| 모듈 | 기능 | 상태 | 완성도 |
|------|------|------|--------|
| **Frontend** | Next.js 15 프로젝트 구조 | ✅ | 95% |
| **Frontend** | 거래 기록 관리 UI | ✅ | 90% |
| **Frontend** | 통계 대시보드 | ✅ | 85% |
| **Frontend** | 실시간 차트 (TradingView) | ✅ | 80% |
| **Frontend** | 다크모드 지원 | ✅ | 100% |
| **Backend** | Spring Boot 3.5.4 설정 | ✅ | 95% |
| **Backend** | JWT + OAuth2 인증 | ✅ | 90% |
| **Backend** | PostgreSQL 연동 | ✅ | 85% |
| **Backend** | Swagger API 문서 | ✅ | 90% |
| **Trading Engine** | FastAPI 프로젝트 구조 | ✅ | 95% |
| **Trading Engine** | 거래 스코어링 시스템 | ✅ | 85% |
| **Trading Engine** | GPT-4 패턴 분석 | ✅ | 80% |
| **Infrastructure** | Docker Compose 설정 | ✅ | 90% |
| **Infrastructure** | 모노레포 구조 | ✅ | 95% |

### 🚧 개발 중인 기능

| 기능 | 예상 완료 | 담당자 | 우선순위 |
|------|-----------|--------|----------|
| 백엔드 거래 CRUD API | 1주 | Backend Team | 높음 |
| 실시간 WebSocket 연동 | 2주 | Full Stack | 중간 |
| Binance API 통합 | 3주 | Backend Team | 높음 |
| 사용자 대시보드 완성 | 2주 | Frontend Team | 중간 |

### 📅 로드맵

#### Phase 1: 기본 기능 완성 (완료)
- [x] 모노레포 구조 구축
- [x] 기본 인증 시스템
- [x] 프론트엔드 UI 컴포넌트
- [x] 매매평가 엔진 기본 구조

#### Phase 2: 백엔드 통합 (진행 중)
- [ ] Spring Boot 거래 API 구현
- [ ] 프론트엔드-백엔드 연동
- [ ] 데이터베이스 스키마 최적화
- [ ] API 성능 최적화

#### Phase 3: 고급 기능 (계획)
- [ ] 실시간 Binance API 연동
- [ ] 자동 거래 기록 수집
- [ ] 고급 분석 대시보드
- [ ] 모바일 앱 개발

---

## 📞 문의 및 지원

### 🐛 이슈 리포팅
- **GitHub Issues**: 버그 리포트 및 기능 요청
- **Security Issues**: 보안 관련 이슈는 별도 연락

### 🤝 기여하기
1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

### 📄 라이선스
이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

<div align="center">

**🚀 Happy Trading! 📈**

*마지막 업데이트: 2025년 8월 12일*

</div>