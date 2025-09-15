package com.example.trading_bot.order.entity;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseTimeEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, length = 20)
    private String symbol;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrderSide side;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderType type;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal quantity;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal price;
    
    @Column(name = "stop_price", precision = 20, scale = 8)
    private BigDecimal stopPrice;
    
    @Column(name = "executed_qty", precision = 20, scale = 8)
    @Builder.Default
    private BigDecimal executedQty = BigDecimal.ZERO;
    
    @Column(name = "executed_price", precision = 20, scale = 8)
    private BigDecimal executedPrice;
    
    @Column(name = "commission", precision = 20, scale = 8)
    @Builder.Default
    private BigDecimal commission = BigDecimal.ZERO;
    
    @Column(name = "commission_asset", length = 10)
    private String commissionAsset;
    
    @Column(name = "binance_order_id", length = 50)
    private String binanceOrderId;
    
    @Column(name = "client_order_id", length = 50)
    private String clientOrderId;
    
    @Column(name = "time_in_force", length = 10)
    private String timeInForce; // GTC, IOC, FOK
    
    @Column(columnDefinition = "TEXT")
    private String errorMessage;
    
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    
    @Column(name = "filled_at")
    private LocalDateTime filledAt;
    
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
}