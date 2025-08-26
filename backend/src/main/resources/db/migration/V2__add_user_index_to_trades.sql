-- trades 테이블에 유저별 조회 성능 최적화를 위한 인덱스 추가

-- user_id 단일 인덱스 (유저별 거래 목록 조회)
CREATE INDEX idx_trades_user_id ON trades(user_id);

-- user_id와 entry_time 복합 인덱스 (유저별 정렬된 거래 목록 조회)
CREATE INDEX idx_trades_user_id_entry_time ON trades(user_id, entry_time DESC);

-- user_id와 id 복합 인덱스 (권한 확인용 빠른 조회)
CREATE INDEX idx_trades_user_id_id ON trades(user_id, id);

-- 통계 조회를 위한 인덱스
CREATE INDEX idx_trades_user_id_symbol ON trades(user_id, symbol);
CREATE INDEX idx_trades_user_id_side ON trades(user_id, side);

-- 인덱스 추가 후 통계 갱신 (PostgreSQL)
ANALYZE trades;