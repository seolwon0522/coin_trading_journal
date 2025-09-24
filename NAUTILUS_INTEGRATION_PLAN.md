# 🚀 Nautilus Trader 통합 계획서

## 📊 프로젝트 개요

### 목표
- **기존 시스템**: Spring Boot (Backend) + Next.js (Frontend) + ~~Trading Engine~~ (제거)
- **신규 시스템**: Spring Boot + Next.js + **Nautilus Trader** (핵심 엔진)
- **통합 방식**: Trading Engine을 Nautilus로 완전 대체, Backend/Frontend는 유지

### 아키텍처
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   Nautilus      │
│   (Next.js)     │     │  (Spring Boot)  │     │    Trader       │
│                 │     │                 │     │                 │
│  ✅ 유지        │     │  ✅ 유지        │     │  🆕 신규        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 📅 단계별 구현 계획

### ✅ Phase 1: 환경 설정 (Day 1) - **완료**
- [x] Python 3.13 환경 구성
- [x] Nautilus Trader 1.220.0 설치
- [x] 프로젝트 구조 생성
- [x] Binance Testnet API 키 설정
- [x] 연결 테스트 성공 (REST + WebSocket)

**검증 결과:**
- Testnet 잔고: 20,000 USDT
- BTC/USDT 실시간 가격 수신 성공
- 414개 거래쌍 확인

---

### 🔄 Phase 2: Nautilus Core 구현 (Day 2-3)

#### Day 2: 기본 구조 설정
```python
nautilus-trader/
├── core/
│   ├── node.py          # Trading Node 메인
│   ├── config.py        # 설정 관리
│   └── logger.py        # 로깅 시스템
├── adapters/
│   ├── binance.py       # Binance 어댑터
│   └── data.py          # 데이터 변환
└── main.py              # 진입점
```

**구현 항목:**
1. TradingNode 초기화
2. Binance 데이터/실행 클라이언트
3. 이벤트 핸들링
4. 로깅 시스템

**테스트:**
- Node 시작/중지
- 실시간 데이터 수신
- 계정 정보 조회

#### Day 3: 설정 테스트 및 검증
- 전체 시스템 통합 테스트
- 메모리 사용량 확인
- 성능 벤치마크

---

### 📈 Phase 3: 전략 구현 (Day 4-7)

#### Day 4-5: RSI 전략
```python
strategies/
├── base_strategy.py     # 베이스 클래스
├── rsi_strategy.py      # RSI 전략
└── indicators/
    └── technical.py     # 기술적 지표
```

**구현 항목:**
1. Strategy 베이스 클래스
2. RSI 지표 계산
3. 매수/매도 신호
4. 포지션 관리
5. 리스크 관리 (손절/익절)

**파라미터:**
- RSI Period: 14
- Oversold: 30
- Overbought: 70
- Position Size: 0.001 BTC
- Stop Loss: 2%
- Take Profit: 3%

#### Day 6-7: 추가 전략
- MACD Strategy
- Moving Average Crossover
- Grid Trading

---

### 📊 Phase 4: 백테스팅 (Day 8-10)

#### Day 8: 백테스트 엔진
```python
backtest/
├── engine.py           # 백테스트 엔진
├── data_loader.py      # 히스토리컬 데이터
├── analyzer.py         # 성과 분석
└── report.py           # 리포트 생성
```

**구현 항목:**
1. BacktestEngine 설정
2. 히스토리컬 데이터 로딩
3. 시뮬레이션 실행
4. 성과 메트릭 계산

**성과 지표:**
- Total Return
- Sharpe Ratio
- Max Drawdown
- Win Rate
- Profit Factor

#### Day 9-10: 백테스트 실행
- 2024년 데이터 백테스트
- 전략 파라미터 최적화
- 결과 분석 및 리포트

---

### 🔗 Phase 5: Spring Boot 통합 (Day 11-13)

#### Day 11: FastAPI Bridge
```python
api/
├── main.py             # FastAPI 앱
├── routes/
│   ├── trading.py      # 거래 API
│   ├── portfolio.py    # 포트폴리오 API
│   └── strategy.py     # 전략 API
└── websocket.py        # WebSocket 서버
```

**API 엔드포인트:**
```
POST /api/trading/start      - 거래 시작
POST /api/trading/stop       - 거래 중지
GET  /api/trading/status     - 상태 조회
GET  /api/portfolio/balance  - 잔고 조회
GET  /api/portfolio/positions - 포지션 조회
POST /api/strategy/add       - 전략 추가
GET  /api/strategy/list      - 전략 목록
POST /api/backtest/run       - 백테스트 실행
```

#### Day 12: Spring Boot 연동
```java
// NautilusService.java
@Service
public class NautilusService {
    public TradingStatus startTrading(TradingRequest request);
    public PortfolioStatus getPortfolio(String userId);
    public BacktestResult runBacktest(BacktestRequest request);
}
```

#### Day 13: WebSocket 통합
- 실시간 포지션 업데이트
- 주문 상태 스트리밍
- 가격 데이터 전달

---

### 🎨 Phase 6: Frontend 통합 (Day 14-15)

#### Day 14: API 서비스 수정
```typescript
// services/tradingService.ts
class TradingService {
    startTrading(strategy: string, symbol: string, amount: number);
    stopTrading(strategyId: string);
    getPortfolio(): Promise<Portfolio>;
    runBacktest(params: BacktestParams): Promise<BacktestResult>;
}
```

#### Day 15: 대시보드 업데이트
- 실시간 차트 연동
- 포트폴리오 현황
- 전략 컨트롤 패널
- 백테스트 결과 시각화

---

### 🚀 Phase 7: Live Trading (Day 16-20)

#### Day 16-17: Testnet 실거래
- Paper Trading 7일
- 성과 모니터링
- 버그 수정

#### Day 18-19: 성능 최적화
- 레이턴시 최소화
- 메모리 최적화
- 오류 처리 강화

#### Day 20: Production 준비
- Docker 컨테이너화
- 모니터링 설정 (Prometheus/Grafana)
- 배포 스크립트

---

## 🎯 핵심 성공 지표

| Phase | 기능 | 성공 기준 | 검증 방법 |
|-------|------|----------|-----------|
| 1 | 환경 설정 | Nautilus 설치 완료 | ✅ 완료 |
| 2 | Core 구현 | Node 실행 성공 | `test_node.py` |
| 3 | 전략 구현 | RSI 전략 동작 | 시뮬레이션 |
| 4 | 백테스팅 | Sharpe > 0.5 | 1년 데이터 |
| 5 | API 통합 | Spring Boot 연동 | 통합 테스트 |
| 6 | Frontend | 대시보드 동작 | UI 테스트 |
| 7 | Live Trading | 7일 수익 양수 | Testnet |

---

## 📁 파일 구조

```
coin_trading_journal/
├── backend/              # ✅ Spring Boot (유지)
├── frontend/            # ✅ Next.js (유지)
├── nautilus-trader/     # 🆕 Nautilus (신규)
│   ├── config/          # 설정
│   ├── strategies/      # 전략
│   ├── backtest/        # 백테스트
│   ├── api/             # FastAPI
│   ├── tests/           # 테스트
│   └── main.py          # 진입점
└── ~~trading-engine/~~  # ❌ 삭제 예정

```

---

## ⚠️ 주의사항

1. **단계별 검증**: 각 Phase 완료 후 반드시 테스트
2. **Testnet 우선**: 모든 기능은 Testnet에서 검증
3. **리스크 관리**:
   - 일일 손실 한도: 5%
   - 포지션당 최대: 10%
   - 동시 포지션: 최대 3개
4. **모니터링**: 실시간 로그 및 알림
5. **백업**: 시스템 장애 시 수동 개입

---

## 📝 현재 상태

- **Day 1**: ✅ 완료 (2025-01-09)
- **Day 2**: 🔄 준비 중
- **예상 완료**: 2025-01-29 (20일)

---

## 🔧 기술 스택

| 구성 요소 | 기술 | 버전 | 상태 |
|----------|------|------|------|
| Trading Engine | Nautilus Trader | 1.220.0 | ✅ |
| Language | Python | 3.13.5 | ✅ |
| Backend | Spring Boot | 3.5.4 | ✅ |
| Frontend | Next.js | 14 | ✅ |
| Database | PostgreSQL | 15 | ✅ |
| Cache | Redis | 7.0 | ✅ |

---

## 📞 참고 자료

- [Nautilus Trader Docs](https://nautilustrader.io/docs/)
- [Binance API Docs](https://binance-docs.github.io/apidocs/)
- [프로젝트 GitHub](https://github.com/your-repo)

---

*Last Updated: 2025-09-24*
*Version: 1.0.0*