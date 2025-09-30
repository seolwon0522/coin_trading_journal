package com.example.trading_bot.dashboard.dto;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
    Integer totalTrades,
    Integer openPositions,
    BigDecimal totalPnl,
    BigDecimal monthlyPnl,
    BigDecimal winRate,
    Integer activeStrategies
) {
}