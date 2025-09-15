package com.example.trading_bot.binance.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BinanceOrderResponse {
    private String symbol;
    private Long orderId;
    private Long orderListId;
    private String clientOrderId;
    private Long transactTime;
    private BigDecimal price;
    private BigDecimal origQty;
    private BigDecimal executedQty;
    private BigDecimal cummulativeQuoteQty;
    private String status; // NEW, PARTIALLY_FILLED, FILLED, CANCELED, REJECTED, EXPIRED
    private String timeInForce;
    private String type;
    private String side;
    
    // Fills 정보 (체결된 거래 정보)
    private Fill[] fills;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Fill {
        private BigDecimal price;
        private BigDecimal qty;
        private BigDecimal commission;
        private String commissionAsset;
        private Long tradeId;
    }
    
    // 평균 체결가 계산
    public BigDecimal getAveragePrice() {
        if (executedQty != null && executedQty.compareTo(BigDecimal.ZERO) > 0 
            && cummulativeQuoteQty != null) {
            return cummulativeQuoteQty.divide(executedQty, 8, BigDecimal.ROUND_HALF_UP);
        }
        return BigDecimal.ZERO;
    }
    
    // 체결 여부 확인
    public boolean isFilled() {
        return "FILLED".equals(status);
    }
    
    // 부분 체결 여부 확인
    public boolean isPartiallyFilled() {
        return "PARTIALLY_FILLED".equals(status);
    }
    
    // 활성 주문 여부 확인
    public boolean isActive() {
        return "NEW".equals(status) || "PARTIALLY_FILLED".equals(status);
    }
}