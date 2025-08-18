package com.example.trading_bot.trade.application.dto;

import com.example.trading_bot.trade.domain.entity.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeResponse {
    
    private Long id;
    private String symbol;
    private TradeType type;
    private TradeSide side;
    private BigDecimal quantity;
    private BigDecimal price;
    private BigDecimal totalAmount;
    private BigDecimal fee;
    private String feeAsset;
    private TradeStatus status;
    private TradeSource source;
    private String externalId;
    private LocalDateTime executedAt;
    private String notes;
    private String strategy;
    private BigDecimal profitLoss;
    private BigDecimal profitLossPercentage;
    private BigDecimal averageEntryPrice;
    private BigDecimal realizedPnl;
    private BigDecimal stopLoss;
    private BigDecimal takeProfit;
    private BigDecimal riskRewardRatio;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static TradeResponse from(Trade trade) {
        return TradeResponse.builder()
            .id(trade.getId())
            .symbol(trade.getSymbol())
            .type(trade.getType())
            .side(trade.getSide())
            .quantity(trade.getQuantity())
            .price(trade.getPrice())
            .totalAmount(trade.getTotalAmount())
            .fee(trade.getFee())
            .feeAsset(trade.getFeeAsset())
            .status(trade.getStatus())
            .source(trade.getSource())
            .externalId(trade.getExternalId())
            .executedAt(trade.getExecutedAt())
            .notes(trade.getNotes())
            .strategy(trade.getStrategy())
            .profitLoss(trade.getProfitLoss())
            .profitLossPercentage(trade.getProfitLossPercentage())
            .averageEntryPrice(trade.getAverageEntryPrice())
            .realizedPnl(trade.getRealizedPnl())
            .stopLoss(trade.getStopLoss())
            .takeProfit(trade.getTakeProfit())
            .riskRewardRatio(trade.getRiskRewardRatio())
            .createdAt(trade.getCreatedAt())
            .updatedAt(trade.getUpdatedAt())
            .build();
    }
}