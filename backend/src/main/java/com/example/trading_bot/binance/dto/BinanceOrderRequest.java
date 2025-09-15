package com.example.trading_bot.binance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BinanceOrderRequest {
    private String symbol;
    private String side; // BUY, SELL
    private String type; // MARKET, LIMIT, STOP_LOSS, etc.
    private String timeInForce; // GTC, IOC, FOK (지정가 주문에만 필요)
    private BigDecimal quantity;
    private BigDecimal price; // 지정가 주문에만 필요
    private BigDecimal stopPrice; // 손절매 주문에만 필요
    private String newClientOrderId; // 고유 주문 ID (선택사항)
}