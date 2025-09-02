package com.example.trading_bot.portfolio.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioSummaryResponse {
    
    private BigDecimal totalValue;       // 총 평가 금액
    private BigDecimal totalInvested;    // 총 투자 금액
    private BigDecimal totalPnl;          // 총 손익
    private BigDecimal totalPnlPercent;   // 총 손익률
    private Integer assetCount;           // 보유 자산 수
    private LocalDateTime lastUpdate;     // 마지막 업데이트
}