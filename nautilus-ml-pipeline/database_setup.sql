-- 백테스트 결과 저장을 위한 PostgreSQL 스키마
-- 기존 trading_journal 데이터베이스에 테이블 추가

-- 백테스트 실행 메타데이터 테이블
CREATE TABLE IF NOT EXISTS backtest_runs (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL, -- 거래 심볼 (BTCUSDT, ETHUSDT 등)
    strategy_type VARCHAR(50) NOT NULL, -- 전략 유형 (breakout, mean_reversion 등)
    start_date TIMESTAMP NOT NULL, -- 백테스트 시작 일시
    end_date TIMESTAMP NOT NULL, -- 백테스트 종료 일시
    timeframe VARCHAR(10) NOT NULL, -- 시간프레임 (1m, 5m, 1h 등)
    total_trades INTEGER NOT NULL DEFAULT 0, -- 총 거래 수
    total_pnl DECIMAL(12,6) NOT NULL DEFAULT 0, -- 총 손익
    win_rate DECIMAL(5,4) DEFAULT 0, -- 승률 (0.0 ~ 1.0)
    max_drawdown DECIMAL(8,4) DEFAULT 0, -- 최대 손실폭 (범위 확장)
    sharpe_ratio DECIMAL(8,4) DEFAULT 0, -- 샤프 비율
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 생성 일시
    status VARCHAR(20) DEFAULT 'completed', -- 실행 상태
    
    -- 인덱스 생성 (빠른 조회를 위해)
    CONSTRAINT idx_backtest_runs_symbol_date UNIQUE (symbol, start_date, end_date, strategy_type)
);

-- 백테스트 개별 거래 결과 테이블
CREATE TABLE IF NOT EXISTS backtest_trades (
    id SERIAL PRIMARY KEY,
    backtest_run_id INTEGER REFERENCES backtest_runs(id) ON DELETE CASCADE,
    
    -- 거래 기본 정보
    timestamp TIMESTAMP NOT NULL, -- 진입 일시
    symbol VARCHAR(20) NOT NULL, -- 거래 심볼
    strategy_type VARCHAR(50) NOT NULL, -- 전략 유형
    
    -- 진입 정보
    entry_price DECIMAL(12,6) NOT NULL, -- 진입 가격
    stop_loss DECIMAL(12,6) NOT NULL DEFAULT 0, -- 손절가
    take_profit DECIMAL(12,6) NOT NULL DEFAULT 0, -- 익절가
    
    -- 전략 점수 및 신뢰도
    strategy_score DECIMAL(5,2), -- 전략 점수 (0-100)
    confidence DECIMAL(5,4), -- 신뢰도 (0.0-1.0)
    risk_level VARCHAR(20), -- 위험 수준 (low, medium, high)
    
    -- 청산 정보
    exit_price DECIMAL(12,6) NOT NULL DEFAULT 0, -- 청산 가격
    exit_timestamp TIMESTAMP, -- 청산 일시
    exit_reason VARCHAR(50), -- 청산 사유 (take_profit, stop_loss, timeout)
    
    -- 성과 지표
    pnl DECIMAL(12,6) NOT NULL DEFAULT 0, -- 손익 (절대값)
    return_pct DECIMAL(8,4), -- 수익률 (%)
    duration_minutes INTEGER, -- 거래 지속 시간 (분)
    
    -- 고급 지표
    entry_timing_score DECIMAL(5,2), -- 진입 타이밍 점수
    exit_timing_score DECIMAL(5,2), -- 청산 타이밍 점수  
    risk_mgmt_score DECIMAL(8,4), -- 리스크 관리 점수
    pnl_ratio DECIMAL(12,8), -- PnL 비율
    target_return_pct DECIMAL(8,4) -- 목표 수익률
);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_backtest_trades_run_timestamp 
    ON backtest_trades (backtest_run_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_backtest_trades_symbol_date 
    ON backtest_trades (symbol, timestamp);

CREATE INDEX IF NOT EXISTS idx_backtest_trades_pnl 
    ON backtest_trades (pnl);

CREATE INDEX IF NOT EXISTS idx_backtest_trades_strategy 
    ON backtest_trades (strategy_type, timestamp);

-- 백테스트 실행 목록 조회 뷰 (자주 사용되는 집계 데이터)
CREATE OR REPLACE VIEW backtest_summary AS
SELECT 
    br.id,
    br.symbol,
    br.strategy_type,
    br.start_date,
    br.end_date,
    br.timeframe,
    br.created_at,
    -- 실시간 계산된 통계
    COUNT(bt.id) as actual_trades,
    COALESCE(SUM(bt.pnl), 0) as actual_total_pnl,
    COALESCE(AVG(CASE WHEN bt.pnl > 0 THEN 1.0 ELSE 0.0 END), 0) as actual_win_rate,
    COALESCE(AVG(bt.return_pct), 0) as avg_return_pct,
    COALESCE(MAX(bt.pnl), 0) as max_win,
    COALESCE(MIN(bt.pnl), 0) as max_loss
FROM backtest_runs br
LEFT JOIN backtest_trades bt ON br.id = bt.backtest_run_id
GROUP BY br.id, br.symbol, br.strategy_type, br.start_date, br.end_date, br.timeframe, br.created_at;

-- 백테스트 결과 통계 함수는 일단 제거 (기본 기능 우선 테스트)
-- CREATE OR REPLACE FUNCTION calculate_backtest_metrics(run_id INTEGER)
-- 향후 PostgreSQL 연결 후 추가 예정
