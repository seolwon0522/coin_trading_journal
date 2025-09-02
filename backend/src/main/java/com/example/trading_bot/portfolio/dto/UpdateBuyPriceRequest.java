package com.example.trading_bot.portfolio.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateBuyPriceRequest {
    
    private String symbol;               // 심볼 (BTCUSDT 등)
    private BigDecimal avgBuyPrice;      // 평균 매수가
    private LocalDateTime firstBuyDate;  // 최초 매수일 (선택)
    private String notes;                // 메모 (선택)
}