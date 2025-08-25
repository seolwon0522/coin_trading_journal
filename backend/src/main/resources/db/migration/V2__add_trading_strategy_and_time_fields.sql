-- Trade 테이블에 새로운 필드 추가 마이그레이션
-- Frontend와 Backend 필드 통일을 위한 스키마 변경

-- 1. 거래 전략 타입 필드 추가
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS trading_strategy VARCHAR(20);

-- 2. 진입/청산 시간 필드 추가
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS entry_time TIMESTAMP;

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS exit_time TIMESTAMP;

-- 3. 기존 데이터 마이그레이션 (executed_at을 entry_time으로 복사)
UPDATE trades 
SET entry_time = executed_at 
WHERE entry_time IS NULL;

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_trades_trading_strategy ON trades(trading_strategy);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_trades_exit_time ON trades(exit_time);

-- 5. 주석 추가 (테이블 문서화)
COMMENT ON COLUMN trades.trading_strategy IS '거래 전략 타입 (BREAKOUT, TREND, COUNTER_TREND, SCALPING, SWING, POSITION)';
COMMENT ON COLUMN trades.entry_time IS '포지션 진입 시간';
COMMENT ON COLUMN trades.exit_time IS '포지션 청산 시간';