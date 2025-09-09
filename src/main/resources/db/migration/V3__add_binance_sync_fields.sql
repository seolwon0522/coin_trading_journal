-- V3__add_binance_sync_fields.sql
-- Binance API 동기화를 위한 필드 추가

-- trades 테이블에 거래소 관련 필드 추가
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS exchange VARCHAR(50),
ADD COLUMN IF NOT EXISTS exchange_trade_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS commission DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS commission_asset VARCHAR(10),
ADD COLUMN IF NOT EXISTS is_maker BOOLEAN,
ADD COLUMN IF NOT EXISTS quote_quantity DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS realized_pnl DECIMAL(20, 8);

-- 중복 방지를 위한 유니크 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_exchange_trade_id 
ON trades(user_id, exchange_trade_id) 
WHERE exchange_trade_id IS NOT NULL;

-- 거래소별 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_trades_exchange 
ON trades(user_id, exchange);

-- user_api_keys 테이블 생성 (이미 존재하지 않는 경우)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(20) NOT NULL,
    api_key VARCHAR(100) NOT NULL,
    encrypted_secret_key TEXT NOT NULL,
    key_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    can_trade BOOLEAN DEFAULT false,
    can_withdraw BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    sync_failure_count INTEGER DEFAULT 0,
    permissions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user_api_keys 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
ON user_api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_exchange 
ON user_api_keys(exchange);

-- 중복 API 키 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_api_key_unique 
ON user_api_keys(user_id, api_key);

-- 활성 API 키 빠른 조회
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active 
ON user_api_keys(user_id, exchange, is_active) 
WHERE is_active = true;