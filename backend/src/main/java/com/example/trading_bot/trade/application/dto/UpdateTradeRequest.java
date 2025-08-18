package com.example.trading_bot.trade.application.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateTradeRequest {
    
    @Size(max = 50, message = "전략명은 50자 이내여야 합니다")
    private String strategy;
    
    @Size(max = 1000, message = "메모는 1000자 이내여야 합니다")
    private String notes;
    
    @DecimalMin(value = "0", message = "손절가는 0 이상이어야 합니다")
    private BigDecimal stopLoss;
    
    @DecimalMin(value = "0", message = "익절가는 0 이상이어야 합니다")
    private BigDecimal takeProfit;
    
    @DecimalMin(value = "0", message = "수수료는 0 이상이어야 합니다")
    private BigDecimal fee;
    
    @Size(max = 20, message = "수수료 자산은 20자 이내여야 합니다")
    private String feeAsset;
}