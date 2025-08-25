package com.example.trading_bot.trade.dto;

import com.example.trading_bot.trade.entity.TradeSide;
import com.example.trading_bot.trade.entity.TradeType;
import com.example.trading_bot.trade.entity.TradingStrategy;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CreateTradeRequest {
    
    @NotBlank
    private String symbol;
    
    @NotNull
    private TradeType type;
    
    @NotNull
    private TradeSide side;
    
    @NotNull
    @Positive
    private BigDecimal quantity;
    
    @NotNull
    @Positive
    private BigDecimal price;
    
    @NotNull
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
}