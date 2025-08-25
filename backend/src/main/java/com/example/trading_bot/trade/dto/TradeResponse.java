package com.example.trading_bot.trade.dto;

import com.example.trading_bot.trade.entity.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TradeResponse {
    
    private Long id;
    private String symbol;
    private TradeType type;
    private TradeSide side;
    private BigDecimal quantity;
    private BigDecimal price;
    private LocalDateTime executedAt;
    
    // 선택 필드
    private BigDecimal fee;
    private String feeAsset;
    private String notes;
    private String strategy;
    private BigDecimal stopLoss;
    private BigDecimal takeProfit;
    private TradingStrategy tradingStrategy;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 계산 필드
    private BigDecimal totalAmount;
    private BigDecimal profitLoss;
    private BigDecimal profitLossPercentage;
    
    // 상태
    private TradeStatus status;
    private TradeSource source;
    
    public static TradeResponse from(Trade trade) {
        TradeResponse response = new TradeResponse();
        response.setId(trade.getId());
        response.setSymbol(trade.getSymbol());
        response.setType(trade.getType());
        response.setSide(trade.getSide());
        response.setQuantity(trade.getQuantity());
        response.setPrice(trade.getPrice());
        response.setExecutedAt(trade.getExecutedAt());
        response.setFee(trade.getFee());
        response.setFeeAsset(trade.getFeeAsset());
        response.setNotes(trade.getNotes());
        response.setStrategy(trade.getStrategy());
        response.setStopLoss(trade.getStopLoss());
        response.setTakeProfit(trade.getTakeProfit());
        response.setTradingStrategy(trade.getTradingStrategy());
        response.setEntryTime(trade.getEntryTime());
        response.setExitTime(trade.getExitTime());
        response.setCreatedAt(trade.getCreatedAt());
        response.setUpdatedAt(trade.getUpdatedAt());
        response.setTotalAmount(trade.getTotalAmount());
        response.setProfitLoss(trade.getProfitLoss());
        response.setProfitLossPercentage(trade.getProfitLossPercentage());
        response.setStatus(trade.getStatus());
        response.setSource(trade.getSource());
        return response;
    }
}