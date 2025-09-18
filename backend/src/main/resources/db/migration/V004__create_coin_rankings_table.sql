-- 코인 랭킹 테이블 생성
CREATE TABLE IF NOT EXISTS coin_rankings (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    base_asset VARCHAR(10) NOT NULL,
    quote_asset VARCHAR(10) NOT NULL,
    rank INTEGER,
    volume_24h DECIMAL(20, 8),
    quote_volume_24h DECIMAL(20, 8),
    price_change_percent_24h DECIMAL(8, 2),
    last_price DECIMAL(20, 8),
    bid_price DECIMAL(20, 8),
    ask_price DECIMAL(20, 8),
    high_price_24h DECIMAL(20, 8),
    low_price_24h DECIMAL(20, 8),
    open_price_24h DECIMAL(20, 8),
    prev_close_price DECIMAL(20, 8),
    weighted_avg_price DECIMAL(20, 8),
    count_24h BIGINT,
    tier INTEGER DEFAULT 3, -- 1: Premium, 2: Standard, 3: Extended
    is_active BOOLEAN DEFAULT true,
    last_update_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_coin_rankings_symbol ON coin_rankings(symbol);
CREATE INDEX idx_coin_rankings_volume ON coin_rankings(quote_volume_24h DESC);
CREATE INDEX idx_coin_rankings_tier ON coin_rankings(tier);
CREATE INDEX idx_coin_rankings_quote_asset ON coin_rankings(quote_asset);
CREATE INDEX idx_coin_rankings_search ON coin_rankings(symbol, base_asset, quote_asset);
CREATE INDEX idx_coin_rankings_last_update ON coin_rankings(last_update_time);

-- 사용자 즐겨찾기 테이블
CREATE TABLE IF NOT EXISTS user_favorite_coins (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_favorite_coins_user ON user_favorite_coins(user_id);

-- 코인 메타데이터 테이블 (선택적)
CREATE TABLE IF NOT EXISTS coin_metadata (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100),
    logo_url VARCHAR(500),
    market_cap DECIMAL(20, 2),
    circulating_supply DECIMAL(20, 8),
    max_supply DECIMAL(20, 8),
    tags TEXT[], -- ['defi', 'layer1', 'gaming']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coin_metadata_symbol ON coin_metadata(symbol);
CREATE INDEX idx_coin_metadata_tags ON coin_metadata USING GIN(tags);