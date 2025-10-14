-- Add strategy_id and type columns to trades table

ALTER TABLE trades
ADD COLUMN strategy_id BIGINT,
ADD COLUMN type VARCHAR(20);

-- Add foreign key constraint
ALTER TABLE trades
ADD CONSTRAINT fk_trades_strategy
FOREIGN KEY (strategy_id) REFERENCES strategies(id)
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_trades_strategy_id ON trades(strategy_id);
CREATE INDEX idx_trades_type ON trades(type);

-- Set default type for existing records
UPDATE trades SET type = 'MANUAL' WHERE type IS NULL;

-- Add comment
COMMENT ON COLUMN trades.strategy_id IS 'Nautilus 자동매매 전략 ID';
COMMENT ON COLUMN trades.type IS '거래 타입: MANUAL (수동), AUTO (자동매매)';
