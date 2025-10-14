package com.example.trading_bot.nautilus.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Nautilus Node 상태 응답 DTO
 */
public record NodeStatusResponse(
        @JsonProperty("is_running") boolean isRunning,
        @JsonProperty("mode") String mode,
        @JsonProperty("strategies_count") Integer strategiesCount,
        @JsonProperty("active_strategies") Integer activeStrategies
) {
}
