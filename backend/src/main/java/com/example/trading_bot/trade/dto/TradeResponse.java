package com.example.trading_bot.trade.dto;

import com.example.trading_bot.trade.entity.Trade;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeResponse {
    
    private Long id;
    private String symbol;
    private String side;
    private BigDecimal entryPrice;
    private BigDecimal entryQuantity;
    private LocalDateTime entryTime;
    private BigDecimal exitPrice;
    private BigDecimal exitQuantity;
    private LocalDateTime exitTime;
    private BigDecimal pnl;
    private BigDecimal pnlPercent;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Entity to DTO 변환 메서드
    public static TradeResponse from(Trade trade) {
        return TradeResponse.builder()
                .id(trade.getId())
                .symbol(trade.getSymbol())
                .side(trade.getSide())
                .entryPrice(trade.getEntryPrice())
                .entryQuantity(trade.getEntryQuantity())
                .entryTime(trade.getEntryTime())
                .exitPrice(trade.getExitPrice())
                .exitQuantity(trade.getExitQuantity())
                .exitTime(trade.getExitTime())
                .pnl(trade.getPnl())
                .pnlPercent(trade.getPnlPercent())
                .notes(trade.getNotes())
                .createdAt(trade.getCreatedAt())
                .updatedAt(trade.getUpdatedAt())
                .build();
    }
}