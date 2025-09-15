package com.example.trading_bot.order.dto;

import com.example.trading_bot.order.entity.Order;
import com.example.trading_bot.order.entity.OrderSide;
import com.example.trading_bot.order.entity.OrderStatus;
import com.example.trading_bot.order.entity.OrderType;
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
public class OrderResponse {
    
    private Long id;
    private String symbol;
    private OrderSide side;
    private OrderType type;
    private OrderStatus status;
    private BigDecimal quantity;
    private BigDecimal price;
    private BigDecimal stopPrice;
    private BigDecimal executedQty;
    private BigDecimal executedPrice;
    private BigDecimal commission;
    private String commissionAsset;
    private String binanceOrderId;
    private String clientOrderId;
    private String timeInForce;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime submittedAt;
    private LocalDateTime filledAt;
    private LocalDateTime cancelledAt;
    private BigDecimal filledPercentage;
    private boolean cancellable;
    
    // Order 엔티티를 Response DTO로 변환
    public static OrderResponse from(Order order) {
        return OrderResponse.builder()
            .id(order.getId())
            .symbol(order.getSymbol())
            .side(order.getSide())
            .type(order.getType())
            .status(order.getStatus())
            .quantity(order.getQuantity())
            .price(order.getPrice())
            .stopPrice(order.getStopPrice())
            .executedQty(order.getExecutedQty())
            .executedPrice(order.getExecutedPrice())
            .commission(order.getCommission())
            .commissionAsset(order.getCommissionAsset())
            .binanceOrderId(order.getBinanceOrderId())
            .clientOrderId(order.getClientOrderId())
            .timeInForce(order.getTimeInForce())
            .errorMessage(order.getErrorMessage())
            .createdAt(order.getCreatedAt())
            .submittedAt(order.getSubmittedAt())
            .filledAt(order.getFilledAt())
            .cancelledAt(order.getCancelledAt())
            .filledPercentage(calculateFilledPercentage(order))
            .cancellable(isCancellable(order))
            .build();
    }
    
    private static BigDecimal calculateFilledPercentage(Order order) {
        if (order.getQuantity() == null || order.getQuantity().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        if (order.getExecutedQty() == null) {
            return BigDecimal.ZERO;
        }
        return order.getExecutedQty()
            .divide(order.getQuantity(), 4, BigDecimal.ROUND_HALF_UP)
            .multiply(new BigDecimal("100"));
    }
    
    private static boolean isCancellable(Order order) {
        return order.getStatus() == OrderStatus.PENDING || 
               order.getStatus() == OrderStatus.SUBMITTED || 
               order.getStatus() == OrderStatus.PARTIALLY_FILLED;
    }
}