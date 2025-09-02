package com.example.trading_bot.portfolio.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioResponse {
    
    private Long id;
    private String symbol;
    private String asset;
    
    // 수량 정보
    private BigDecimal quantity;
    private BigDecimal free;
    private BigDecimal locked;
    
    // 가격 정보
    private BigDecimal avgBuyPrice;
    private BigDecimal totalInvested;
    private BigDecimal currentPrice;
    private BigDecimal currentValue;
    
    // 손익 정보
    private BigDecimal unrealizedPnl;
    private BigDecimal unrealizedPnlPercent;
    
    // 일시 정보
    private LocalDateTime firstBuyDate;
    private LocalDateTime lastBuyDate;
    private LocalDateTime lastPriceUpdate;
    private LocalDateTime lastBalanceUpdate;
    
    // 메타 정보
    private String notes;
    private Boolean isManualEntry;
}