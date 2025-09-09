package com.example.trading_bot.trade.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class TradeRequest {
    
    @NotBlank(message = "심볼은 필수입니다")
    private String symbol;
    
    @NotBlank(message = "매수/매도 구분은 필수입니다")
    private String side; // "BUY" or "SELL"
    
    @NotNull(message = "진입 가격은 필수입니다")
    @Positive(message = "진입 가격은 0보다 커야 합니다")
    private BigDecimal entryPrice;
    
    @NotNull(message = "진입 수량은 필수입니다")
    @Positive(message = "진입 수량은 0보다 커야 합니다")
    private BigDecimal entryQuantity;
    
    @NotNull(message = "진입 시간은 필수입니다")
    private LocalDateTime entryTime;
    
    // 선택 필드
    private BigDecimal exitPrice;
    private BigDecimal exitQuantity;
    private LocalDateTime exitTime;
    private String notes;
}