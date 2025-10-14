-- V13: Extend base_asset and quote_asset column length
-- Description: BROCCOLI714 같은 긴 심볼명 지원을 위해 길이 확장 (10 -> 20)

ALTER TABLE coin_rankings
    ALTER COLUMN base_asset TYPE VARCHAR(20);

ALTER TABLE coin_rankings
    ALTER COLUMN quote_asset TYPE VARCHAR(20);
