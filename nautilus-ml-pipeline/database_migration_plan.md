# 백테스트 결과 데이터베이스 마이그레이션 계획

## 현재 문제점

- 7,300줄 CSV 파일을 매번 전체 읽기 (매우 비효율적)
- 백테스트 결과마다 새로운 CSV 파일 생성
- 웹 API에서 매번 파일 시스템 스캔

## 해결방안: PostgreSQL 기반 데이터 저장

### 1. 데이터베이스 테이블 설계

```sql
-- 백테스트 실행 메타데이터
CREATE TABLE backtest_runs (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    total_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(15,8) DEFAULT 0,
    win_rate DECIMAL(5,4) DEFAULT 0,
    max_drawdown DECIMAL(5,4) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed'
);

-- 백테스트 개별 거래 결과
CREATE TABLE backtest_trades (
    id SERIAL PRIMARY KEY,
    backtest_run_id INTEGER REFERENCES backtest_runs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    entry_price DECIMAL(15,8) NOT NULL,
    stop_loss DECIMAL(15,8),
    take_profit DECIMAL(15,8),
    strategy_score DECIMAL(5,2),
    confidence DECIMAL(5,4),
    risk_level VARCHAR(20),
    exit_price DECIMAL(15,8),
    exit_timestamp TIMESTAMP,
    pnl DECIMAL(15,8),
    return_pct DECIMAL(8,4),
    duration_minutes INTEGER,
    exit_reason VARCHAR(50),
    entry_timing_score DECIMAL(5,2),
    exit_timing_score DECIMAL(5,2),
    risk_mgmt_score DECIMAL(8,4),
    pnl_ratio DECIMAL(12,8),
    target_return_pct DECIMAL(8,4),
    INDEX idx_backtest_timestamp (backtest_run_id, timestamp),
    INDEX idx_symbol_date (symbol, timestamp),
    INDEX idx_pnl (pnl)
);
```

### 2. 성능 개선 효과

- **조회 속도**: 7,300줄 CSV 읽기 → 인덱스 기반 SQL 쿼리 (100배+ 향상)
- **필터링**: 날짜/심볼별 조회 시 전체 스캔 → 인덱스 활용
- **집계**: 실시간 통계 계산 → 사전 계산된 메트릭 활용
- **동시성**: 파일 락 없음 → 다중 사용자 동시 접근

### 3. 구현 단계

1. 데이터베이스 스키마 생성
2. CSV → DB 마이그레이션 스크립트 작성
3. 백테스트 러너 수정 (CSV 저장 → DB 저장)
4. API 엔드포인트 수정 (CSV 읽기 → DB 쿼리)
5. 기존 CSV 파일 정리

### 4. 예상 개선 효과

- **응답시간**: 2-3초 → 50-100ms
- **메모리 사용량**: 7,300 \* 20 컬럼 → 필요한 컬럼만 조회
- **확장성**: 파일 개수 제한 → 무제한 데이터 저장
- **유지보수**: 파일 관리 복잡성 → SQL 기반 단순한 데이터 관리
