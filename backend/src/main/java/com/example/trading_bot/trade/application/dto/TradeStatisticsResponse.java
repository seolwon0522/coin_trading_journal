package com.example.trading_bot.trade.application.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeStatisticsResponse {
    
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    
    // 기본 통계
    private Long totalTrades;
    private Long winningTrades;
    private Long losingTrades;
    private BigDecimal winRate;
    
    // 손익 통계
    private BigDecimal totalProfitLoss;
    private BigDecimal totalProfit;
    private BigDecimal totalLoss;
    private BigDecimal averageProfit;
    private BigDecimal averageLoss;
    private BigDecimal averageReturn;
    
    // 거래 금액 통계
    private BigDecimal totalVolume;
    private BigDecimal averageTradeSize;
    
    // 최고/최저 기록
    private BigDecimal largestWin;
    private BigDecimal largestLoss;
    private BigDecimal bestWinRate;
    private BigDecimal worstLossRate;
    
    // 리스크 지표
    private BigDecimal profitFactor;
    private BigDecimal sharpeRatio;
    private BigDecimal maxDrawdown;
    private BigDecimal averageRiskRewardRatio;
    
    // 거래 빈도
    private BigDecimal tradesPerDay;
    private BigDecimal tradesPerWeek;
    private BigDecimal tradesPerMonth;
    
    // 심볼별 통계
    private String mostTradedSymbol;
    private String mostProfitableSymbol;
    private String leastProfitableSymbol;
    private Integer uniqueSymbolsCount;
}