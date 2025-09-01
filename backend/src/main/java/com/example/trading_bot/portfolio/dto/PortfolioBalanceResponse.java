package com.example.trading_bot.portfolio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 포트폴리오 잔고 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioBalanceResponse {
    
    // 총 자산 가치 (USDT 기준)
    private BigDecimal totalValueUsdt;
    
    // 총 자산 가치 (BTC 기준)
    private BigDecimal totalValueBtc;
    
    // 개별 자산 목록
    private List<AssetBalance> balances;
    
    // 조회 시간
    private LocalDateTime timestamp;
    
    /**
     * 개별 자산 정보
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AssetBalance {
        private String asset;           // 코인 심볼 (BTC, ETH 등)
        private BigDecimal free;        // 사용 가능 잔고
        private BigDecimal locked;      // 잠긴 잔고
        private BigDecimal total;       // 총 잔고 (free + locked)
        private BigDecimal priceUsdt;   // 현재 USDT 가격
        private BigDecimal valueUsdt;   // USDT 환산 가치
        private BigDecimal allocation;  // 포트폴리오 내 비중 (%)
    }
}