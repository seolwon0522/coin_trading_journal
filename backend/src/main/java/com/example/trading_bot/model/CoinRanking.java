package com.example.trading_bot.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "coin_rankings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoinRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String symbol;

    @Column(name = "base_asset", nullable = false, length = 20)
    private String baseAsset;

    @Column(name = "quote_asset", nullable = false, length = 20)
    private String quoteAsset;

    private Integer rank;

    @Column(name = "volume_24h", precision = 30, scale = 8)
    private BigDecimal volume24h;

    @Column(name = "quote_volume_24h", precision = 30, scale = 8)
    private BigDecimal quoteVolume24h;

    @Column(name = "price_change_percent_24h", precision = 8, scale = 2)
    private BigDecimal priceChangePercent24h;

    @Column(name = "last_price", precision = 20, scale = 8)
    private BigDecimal lastPrice;

    @Column(name = "bid_price", precision = 20, scale = 8)
    private BigDecimal bidPrice;

    @Column(name = "ask_price", precision = 20, scale = 8)
    private BigDecimal askPrice;

    @Column(name = "high_price_24h", precision = 20, scale = 8)
    private BigDecimal highPrice24h;

    @Column(name = "low_price_24h", precision = 20, scale = 8)
    private BigDecimal lowPrice24h;

    @Column(name = "open_price_24h", precision = 20, scale = 8)
    private BigDecimal openPrice24h;

    @Column(name = "prev_close_price", precision = 20, scale = 8)
    private BigDecimal prevClosePrice;

    @Column(name = "weighted_avg_price", precision = 20, scale = 8)
    private BigDecimal weightedAvgPrice;

    @Column(name = "count_24h")
    private Long count24h;

    @Column(columnDefinition = "INTEGER DEFAULT 3")
    private Integer tier; // 1: Premium, 2: Standard, 3: Extended

    @Column(name = "is_active", columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean isActive;

    @Column(name = "last_update_time")
    private LocalDateTime lastUpdateTime;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        lastUpdateTime = LocalDateTime.now();
        if (isActive == null) {
            isActive = true;
        }
        if (tier == null) {
            tier = 3;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        lastUpdateTime = LocalDateTime.now();
    }

    public enum Tier {
        PREMIUM(1),
        STANDARD(2),
        EXTENDED(3);

        private final int value;

        Tier(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }
    }
}