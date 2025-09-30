package com.example.trading_bot.nautilus.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Nautilus 트레이딩 전략 상태 DTO
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NautilusStrategyStatus(
        @JsonProperty("strategy_id") String strategyId,
        @JsonProperty("active") Boolean active,
        @JsonProperty("realized_pnl") BigDecimal realizedPnl,
        @JsonProperty("unrealized_pnl") BigDecimal unrealizedPnl,
        @JsonProperty("total_trades") Integer totalTrades,
        @JsonProperty("updated_at") OffsetDateTime updatedAt
) {
}