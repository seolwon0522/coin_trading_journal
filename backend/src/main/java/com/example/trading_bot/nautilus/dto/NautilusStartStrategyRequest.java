package com.example.trading_bot.nautilus.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * Nautilus 트레이딩 전략 시작 요청 DTO
 */
public record NautilusStartStrategyRequest(
        @JsonProperty("strategy_id") String strategyId,
        @JsonProperty("type") String type,
        @JsonProperty("symbol") String symbol,
        @JsonProperty("timeframe") String timeframe,
        @JsonProperty("params") Map<String, Object> params,
        @JsonProperty("testnet") boolean testnet
) {
}