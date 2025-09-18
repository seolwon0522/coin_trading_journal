package com.example.trading_bot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MarketDataResponse {

    private String symbol;
    private String baseAsset;
    private String quoteAsset;
    private Integer rank;
    private BigDecimal price;
    private BigDecimal volume24h;
    private BigDecimal quoteVolume24h;
    private BigDecimal priceChangePercent24h;
    private BigDecimal highPrice24h;
    private BigDecimal lowPrice24h;
    private BigDecimal marketCap; // Optional
    private Integer tier;
    private LocalDateTime lastUpdate;

    // UI specific fields
    private Boolean isFavorite;
    private String displayName;
    private String logoUrl;
}