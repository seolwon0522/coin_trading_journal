package com.example.trading_bot.dto;

import com.example.trading_bot.model.CoinRanking;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TieredMarketData {

    // Premium tier: Top 20 coins (실시간 업데이트)
    private List<CoinRanking> premium;

    // Standard tier: 21-100 coins (3초 업데이트)
    private List<CoinRanking> standard;

    // Extended tier: 나머지 코인 (온디맨드)
    private List<CoinRanking> extended;

    // 메타데이터
    private long totalCount;
    private LocalDateTime lastUpdate;
    private String quoteAsset;

    // 페이지네이션 정보
    private int currentPage;
    private int pageSize;
    private boolean hasMore;

    // 성능 지표
    private long loadTime;
    private String cacheStatus; // HIT, MISS, PARTIAL
}