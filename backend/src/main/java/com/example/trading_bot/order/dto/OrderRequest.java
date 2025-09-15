package com.example.trading_bot.order.dto;

import com.example.trading_bot.order.entity.OrderSide;
import com.example.trading_bot.order.entity.OrderType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {
    
    @NotNull(message = "심볼은 필수입니다")
    private String symbol;
    
    @NotNull(message = "주문 방향은 필수입니다")
    private OrderSide side;
    
    @NotNull(message = "주문 타입은 필수입니다")
    private OrderType type;
    
    @NotNull(message = "수량은 필수입니다")
    @Positive(message = "수량은 양수여야 합니다")
    private BigDecimal quantity;
    
    // 지정가 주문일 때 필수
    @Positive(message = "가격은 양수여야 합니다")
    private BigDecimal price;
    
    // 손절매 주문일 때 필수
    @Positive(message = "손절가는 양수여야 합니다")
    private BigDecimal stopPrice;
    
    // 지정가 주문일 때 사용 (GTC, IOC, FOK)
    private String timeInForce;
    
    // 테스트 모드 여부
    @Builder.Default
    private boolean testMode = false;
}