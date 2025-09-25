-- 전략 테이블 생성
CREATE TABLE IF NOT EXISTS strategies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    strategy_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    params JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_testnet BOOLEAN DEFAULT TRUE,

    -- Performance metrics
    total_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2),
    total_return DECIMAL(10,2),
    max_drawdown DECIMAL(10,2),
    sharpe_ratio DECIMAL(5,2),
    realized_pnl DECIMAL(12,2) DEFAULT 0,
    unrealized_pnl DECIMAL(12,2) DEFAULT 0,

    -- Tracking fields
    activated_at TIMESTAMP,
    deactivated_at TIMESTAMP,
    last_trade_at TIMESTAMP,
    description VARCHAR(500),

    -- Nautilus integration
    nautilus_strategy_id VARCHAR(255) UNIQUE,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_strategy_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX idx_strategies_user_id ON strategies(user_id);
CREATE INDEX idx_strategies_active ON strategies(is_active);
CREATE INDEX idx_strategies_symbol ON strategies(symbol);
CREATE INDEX idx_strategies_type ON strategies(strategy_type);
CREATE INDEX idx_strategies_nautilus_id ON strategies(nautilus_strategy_id);

-- 전략 실행 이력 테이블
CREATE TABLE IF NOT EXISTS strategy_executions (
    id BIGSERIAL PRIMARY KEY,
    strategy_id BIGINT NOT NULL,
    execution_type VARCHAR(50) NOT NULL, -- START, STOP, UPDATE, BACKTEST
    status VARCHAR(50) NOT NULL, -- PENDING, RUNNING, COMPLETED, FAILED
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    params JSONB,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_execution_strategy FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- 백테스트 결과 테이블
CREATE TABLE IF NOT EXISTS strategy_backtests (
    id BIGSERIAL PRIMARY KEY,
    strategy_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital DECIMAL(12,2) NOT NULL,
    final_capital DECIMAL(12,2),
    total_trades INTEGER,
    winning_trades INTEGER,
    losing_trades INTEGER,
    max_drawdown DECIMAL(10,2),
    sharpe_ratio DECIMAL(5,2),
    total_return DECIMAL(10,2),
    total_pnl DECIMAL(12,2),
    result_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_backtest_strategy FOREIGN KEY (strategy_id) REFERENCES strategies(id) ON DELETE CASCADE
);

-- 주석 추가
COMMENT ON TABLE strategies IS '자동매매 전략 테이블';
COMMENT ON COLUMN strategies.strategy_type IS 'EMA_CROSS, MARKET_MAKER, ORDERBOOK_IMBALANCE 등';
COMMENT ON COLUMN strategies.params IS '전략별 파라미터 (JSON 형식)';
COMMENT ON COLUMN strategies.nautilus_strategy_id IS 'Nautilus Trader 시스템에서 사용하는 고유 ID';