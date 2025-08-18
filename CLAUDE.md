# CryptoTradeManager - Claude AI 개발 가이드

## 📋 프로젝트 개요

**CryptoTradeManager**는 Binance API를 활용한 암호화폐 트레이딩 저널 및 자동매매 플랫폼입니다.

### 핵심 기능
- 🔄 실시간 거래 데이터 수집 및 분석
- 📊 AI/ML 기반 매매 성과 평가 및 피드백
- 🤖 전략 기반 자동매매 시스템
- 📈 백테스팅 및 성과 시뮬레이션
- 💻 실시간 대시보드 및 모니터링

### 프로젝트 구조
```
coin_trading_journal/
├── backend/           # Spring Boot 애플리케이션
├── frontend/         # Next.js 프론트엔드
├── ml-dashboard-frontend/  # ML 모니터링 대시보드
├── ml_scoring/       # Python ML 스코어링 엔진
├── nautilus-ml-pipeline/   # ML 파이프라인 및 백테스팅
└── trading-engine/   # FastAPI 트레이딩 엔진
```

## 🛠️ 기술 스택
### Backend
- **Framework**: Spring Boot 3.5.4 (Java 17)
- **Database**: PostgreSQL + Redis 7.0
- **Build Tool**: Gradle 8.x
- **Security**: Spring Security + OAuth2

### Frontend  
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query + Zustand
- **Charts**: Chart.js + TradingView Widgets

### ML/AI Pipeline
- **Language**: Python 3.11+
- **ML Framework**: XGBoost, scikit-learn
- **API Framework**: FastAPI
- **Backtesting**: Nautilus Trader
- **Data Processing**: Pandas, NumPy

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Cloud**: AWS (EC2, RDS, ElastiCache)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

## 🎯 개발 원칙 및 가이드라인

### 1. 코드 품질 원칙
```yaml
Code Quality:
  - 테스트 커버리지: 80% 이상
  - 코드 리뷰: 모든 PR 필수
  - 린팅: 커밋 전 자동 실행
  - 문서화: 코드와 함께 업데이트
```

### 2. 보안 원칙
```yaml
Security First:
  - API 키 암호화: 환경 변수 사용
  - 인증/인가: JWT + OAuth2
  - 데이터 보호: HTTPS 필수
  - 취약점 스캔: 정기적 실행
```

### 3. 성능 목표
```yaml
Performance Targets:
  - API 응답 시간: < 200ms
  - WebSocket 지연: < 50ms
  - 대시보드 로딩: < 2초
  - 백테스트 처리: 1년 데이터 < 5분
```

## 🤖 AI 전문가 팀 구성

### 핵심 전문가 팀

| 작업 영역 | 전담 에이전트 | 주요 책임 | 우선순위 |
|----------|-------------|---------|----------|
| **백엔드 API** | `@api-architect` | REST/WebSocket API 설계, Binance API 통합 | ⭐⭐⭐ |
| **Spring Boot** | `@backend-developer` | 비즈니스 로직, 데이터베이스, 보안 | ⭐⭐⭐ |
| **React/Next.js** | `@react-nextjs-expert` | Next.js 프론트엔드, 컴포넌트 개발 | ⭐⭐⭐ |
| **ML/AI** | `@backend-developer` | Python ML 파이프라인, 백테스팅 | ⭐⭐⭐ |
| **성능 최적화** | `@performance-optimizer` | 실시간 처리, 병목 해결 | ⭐⭐ |
| **코드 리뷰** | `@code-reviewer` | 보안, 품질, 버그 예방 | ⭐⭐ |
| **문서화** | `@documentation-specialist` | API 문서, 가이드 작성 | ⭐ |

### 효과적인 에이전트 활용법

#### ✅ 올바른 사용 예시
```bash
# 구체적이고 명확한 요청
@backend-developer Binance WebSocket 데이터를 받아서 PostgreSQL에 저장하는 서비스를 구현해주세요.
요구사항:
- Spring Boot WebSocket 클라이언트
- 실시간 가격 데이터 처리
- 트랜잭션 처리 포함

@react-nextjs-expert 실시간 차트를 표시하는 대시보드 컴포넌트를 만들어주세요.
기능: Chart.js 사용, 1분/5분/1시간 인터벌, 반응형 디자인
```

#### ❌ 피해야 할 사용 예시
```bash
# 너무 모호한 요청
@backend-developer 백엔드 만들어주세요

# 잘못된 에이전트 선택
@react-nextjs-expert Spring Boot 컨트롤러 만들어주세요
```

### 특수 영역별 협업 체계

#### 🏗️ 시스템 아키텍처 설계
- **주 담당**: `@api-architect` + `@backend-developer`
- **협업 방식**: API 스펙 먼저 정의 → 백엔드 구현 → 프론트엔드 연동
- **핵심 영역**: Binance API 통합, 실시간 데이터 파이프라인, 자동매매 엔진

#### 📊 실시간 대시보드
- **주 담당**: `@react-component-architect` + `@frontend-developer`
- **협업 방식**: 컴포넌트 설계 → UI 구현 → 성능 최적화 → 사용성 테스트
- **핵심 영역**: 실시간 차트, 포트폴리오 현황, 매매 현황 모니터링

#### ⚡ 고성능 처리
- **주 담당**: `@performance-optimizer` + `@backend-developer`
- **협업 방식**: 성능 측정 → 병목 분석 → 최적화 적용 → 검증
- **핵심 영역**: WebSocket 처리, 대량 거래 데이터 처리, 실시간 분석

#### 🤖 AI 분석 시스템
- **주 담당**: `@backend-developer` + `@api-architect`
- **협업 방식**: 분석 알고리즘 설계 → API 구현 → 성능 튜닝
- **핵심 영역**: 매매 성과 점수화, AI 피드백 생성, 백테스트 엔진

#### 🔐 보안 및 품질
- **주 담당**: `@code-reviewer` + `@backend-developer`
- **협업 방식**: 보안 요구사항 정의 → 구현 → 보안 리뷰 → 취약점 수정
- **핵심 영역**: API 키 암호화, 사용자 인증, 데이터 보호

### 개발 단계별 에이전트 활용 가이드

#### Phase 1: 인프라 및 기본 구조 (Week 1-6)
```
1. @api-architect → 전체 API 스펙 설계
2. @backend-developer → Spring Boot 기본 구조, 인증 시스템
3. @frontend-developer → React 프로젝트 초기 설정
4. @documentation-specialist → 개발 가이드, API 문서
```

#### Phase 2: 핵심 거래 기능 (Week 7-14)
```
1. @backend-developer → Binance API 연동, 거래 데이터 관리
2. @react-component-architect → 대시보드 컴포넌트 
3. @performance-optimizer → 실시간 데이터 처리 최적화
4. @code-reviewer → 보안 검토, 코드 품질 관리
```

#### Phase 3: AI 분석 시스템 (Week 15-20)
```
1. @backend-developer → AI 분석 엔진, 백테스트 시스템
2. @api-architect → 분석 결과 API 설계
3. @react-component-architect → 분석 결과 시각화 컴포넌트
4. @performance-optimizer → 대량 데이터 분석 최적화
```

#### Phase 4: 자동매매 시스템 (Week 21-26)
```
1. @backend-developer → 매매 봇 엔진, 리스크 관리
2. @performance-optimizer → 실시간 주문 처리 최적화
3. @code-reviewer → 자동매매 로직 보안 검토
4. @documentation-specialist → 봇 운용 가이드
```

## 🛠️ 개발 워크플로우

### 프로젝트 초기 설정
```bash
# 1. 환경 설정
cp env.example .env
# .env 파일에 Binance API 키 설정

# 2. Docker 컨테이너 실행
docker-compose up -d

# 3. 백엔드 실행
cd backend
./gradlew bootRun

# 4. 프론트엔드 실행
cd frontend
npm install
npm run dev

# 5. ML 서비스 실행
cd ml_scoring
python -m uvicorn app.main:app --reload
```

### 개발 모드 명령어
```bash
# 전체 시스템 테스트
./run.bat test

# 개별 서비스 테스트
cd backend && ./gradlew test
cd frontend && npm test
cd ml_scoring && pytest

# 빌드 및 배포
./build.bat
docker-compose build
docker-compose push
```

## 📊 성과 지표 및 모니터링

### 핵심 성과 지표 (KPI)

| 영역 | 지표 | 목표 | 측정 방법 |
|------|------|------|---------|
| **성능** | API 응답 시간 | < 200ms | Prometheus |
| **성능** | WebSocket 지연 | < 50ms | 실시간 모니터링 |
| **품질** | 코드 커버리지 | > 80% | JaCoCo, Jest |
| **보안** | 취약점 수 | 0개 | SonarQube |
| **사용성** | 대시보드 로딩 | < 2초 | Lighthouse |
| **ML** | 백테스트 정확도 | > 65% | ML Pipeline |

## 🔧 자주 사용하는 명령어

### Spring Boot (Backend)
```bash
# 애플리케이션 실행
./gradlew bootRun

# 테스트 실행
./gradlew test

# 빌드
./gradlew build

# 데이터베이스 마이그레이션
./gradlew flywayMigrate
```

### Next.js (Frontend)
```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 후 실행
npm start

# 테스트
npm test

# 린트
npm run lint
```

### Python ML Services
```bash
# FastAPI 서버 실행
uvicorn app.main:app --reload --port 8001

# ML 학습 실행
python ml_pipeline/model_trainer.py

# 백테스트 실행
python run_1year_backtest.py

# 테스트
pytest tests/
```

### Docker Commands
```bash
# 전체 서비스 실행
docker-compose up -d

# 특정 서비스 로그 확인
docker-compose logs -f backend

# 데이터베이스 접속
docker exec -it postgres psql -U cryptouser -d cryptodb

# Redis CLI 접속
docker exec -it redis redis-cli
```

## 🛡️ 트러블슈팅 가이드

### 자주 발생하는 문제

#### 1. WebSocket 연결 끊김
```yaml
문제: Binance WebSocket 연결이 자주 끊김
해결:
  - 핑퐁 메커니즘 구현
  - 재연결 로직 강화
  - 연결 풀 관리
코드: backend/src/main/java/com/crypto/websocket/BinanceWebSocketClient.java
```

#### 2. 메모리 누수
```yaml
문제: 장시간 실행 시 메모리 증가
해결:
  - 캐시 TTL 설정
  - 불필요한 데이터 정리
  - 비동기 처리 최적화
모니터링: docker stats
```

#### 3. 데이터베이스 성능
```yaml
문제: 대량 데이터 조회 시 지연
해결:
  - 인덱스 최적화
  - 페이지네이션 구현
  - Redis 캐싱 활용
SQL: nautilus-ml-pipeline/database_setup.sql
```

## 📝 코드 컨벤션 및 베스트 프랙티스

### Java/Spring Boot
```java
// 패키지 구조
com.crypto.trading
  ├─ controller/   // REST 컨트롤러
  ├─ service/      // 비즈니스 로직
  ├─ repository/   // 데이터 접근
  ├─ entity/       // JPA 엔티티
  ├─ dto/          // 데이터 전송 객체
  └─ config/       // 설정 클래스

// 네이밍 규칙
- 클래스: PascalCase (TradeService)
- 메서드: camelCase (getTrades)
- 상수: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)
```

### TypeScript/React
```typescript
// 컴포넌트 구조
src/
  ├─ components/   // UI 컴포넌트
  ├─ hooks/        // 커스텀 훅
  ├─ lib/          // 유틸리티
  ├─ types/        // 타입 정의
  └─ app/          // Next.js 페이지

// 컴포넌트 패턴
const Component: FC<Props> = ({ prop1, prop2 }) => {
  // hooks
  const [state, setState] = useState()
  
  // effects
  useEffect(() => {}, [])
  
  // handlers
  const handleClick = () => {}
  
  // render
  return <div>...</div>
}
```

### Python
```python
# 파일 구조
ml_scoring/
  ├─ app/          # FastAPI 애플리케이션
  ├─ ml/           # ML 모델 및 로직
  ├─ tests/        # 테스트 코드
  └─ utils/        # 유틸리티 함수

# 네이밍 규칙
- 함수/변수: snake_case (calculate_score)
- 클래스: PascalCase (ModelTrainer)
- 상수: UPPER_SNAKE_CASE (MAX_EPOCHS)
```

## 💡 팁과 트릭

### 성능 최적화
1. **Redis 캐싱**: 빈번한 API 호출 결과 캐싱
2. **비동기 처리**: WebSocket 데이터는 비동기로 처리
3. **배치 처리**: 대량 데이터는 배치로 처리
4. **인덱스 최적화**: 크리티컬 쿼리에 적절한 인덱스

### 보안 체크리스트
- [ ] API 키는 환경 변수로 관리
- [ ] HTTPS 사용 필수
- [ ] JWT 토큰 만료 시간 설정
- [ ] SQL 인젝션 방지
- [ ] XSS/CSRF 방어 구현
- [ ] Rate Limiting 설정

### 테스트 전략
1. **단위 테스트**: 모든 비즈니스 로직
2. **통합 테스트**: API 엔드포인트
3. **E2E 테스트**: 핵심 사용자 시나리오
4. **백테스트**: ML 모델 성능 검증

---

💡 **팁**: 개발 시 AI 에이전트를 효과적으로 활용하면서도 항상 코드를 검토하고 테스트하세요.

🔒 **중요**: Binance API 키는 절대로 하드코딩하지 마세요. 항상 환경 변수를 사용하세요.

🚀 **성공 팁**: 매일 조금씩 개선하고, 테스트를 철저히 하며, 문서화를 게을리하지 마세요!
