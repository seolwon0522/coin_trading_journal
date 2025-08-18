package com.example.trading_bot.trade.application.dto;

import com.example.trading_bot.trade.domain.entity.TradeSide;
import com.example.trading_bot.trade.domain.entity.TradeType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTradeRequest {
    
    @NotBlank(message = "심볼은 필수입니다")
    @Size(max = 20, message = "심볼은 20자 이내여야 합니다")
    private String symbol;
    
    @NotNull(message = "거래 타입은 필수입니다")
    private TradeType type;
    
    @NotNull(message = "거래 방향은 필수입니다")
    private TradeSide side;
    
    @NotNull(message = "수량은 필수입니다")
    @DecimalMin(value = "0.00000001", message = "수량은 0보다 커야 합니다")
    private BigDecimal quantity;
    
    @NotNull(message = "가격은 필수입니다")
    @DecimalMin(value = "0.00000001", message = "가격은 0보다 커야 합니다")
    private BigDecimal price;
    
    @DecimalMin(value = "0", message = "수수료는 0 이상이어야 합니다")
    private BigDecimal fee;
    
    @Size(max = 20, message = "수수료 자산은 20자 이내여야 합니다")
    private String feeAsset;
    
    @NotNull(message = "체결 시간은 필수입니다")
    @PastOrPresent(message = "체결 시간은 현재 시간 이전이어야 합니다")
    private LocalDateTime executedAt;
    
    @Size(max = 50, message = "전략명은 50자 이내여야 합니다")
    private String strategy;
    
    @Size(max = 1000, message = "메모는 1000자 이내여야 합니다")
    private String notes;
    
    @DecimalMin(value = "0", message = "손절가는 0 이상이어야 합니다")
    private BigDecimal stopLoss;
    
    @DecimalMin(value = "0", message = "익절가는 0 이상이어야 합니다")
    private BigDecimal takeProfit;
}