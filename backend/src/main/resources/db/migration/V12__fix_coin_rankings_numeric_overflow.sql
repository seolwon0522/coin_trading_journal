-- V12: Fix CoinRanking numeric field overflow issues
-- Description: 거래량 필드의 precision을 30으로 증가하여 오버플로우 방지

-- 1. 거래량 컬럼 타입 변경 (20,8 -> 30,8)
ALTER TABLE coin_rankings
    ALTER COLUMN volume_24h TYPE NUMERIC(30, 8);

ALTER TABLE coin_rankings
    ALTER COLUMN quote_volume_24h TYPE NUMERIC(30, 8);

-- 2. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_coin_rankings_quote_volume
    ON coin_rankings(quote_volume_24h DESC);

CREATE INDEX IF NOT EXISTS idx_coin_rankings_rank
    ON coin_rankings(rank);

CREATE INDEX IF NOT EXISTS idx_coin_rankings_is_active
    ON coin_rankings(is_active);

-- 3. 복합 인덱스 (계층별 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_coin_rankings_tier_volume
    ON coin_rankings(tier, quote_volume_24h DESC)
    WHERE is_active = true;

-- 4. 심볼 조회 최적화
CREATE INDEX IF NOT EXISTS idx_coin_rankings_symbol_active
    ON coin_rankings(symbol)
    WHERE is_active = true;
