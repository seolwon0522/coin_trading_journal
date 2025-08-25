package com.example.trading_bot.trade.entity;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "trades", indexes = {
    @Index(name = "idx_trades_user_id", columnList = "user_id"),
    @Index(name = "idx_trades_symbol", columnList = "symbol"),
    @Index(name = "idx_trades_executed_at", columnList = "executed_at"),
    @Index(name = "idx_trades_source", columnList = "source")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Trade extends BaseTimeEntity {
    
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
    private TradeType type;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TradeSide side;
    
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal quantity;
    
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal price;
    
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal totalAmount;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal fee;
    
    @Column(length = 20)
    private String feeAsset;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TradeStatus status;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TradeSource source;
    
    @Column(name = "external_id", unique = true)
    private String externalId;
    
    @Column(name = "executed_at", nullable = false)
    private LocalDateTime executedAt;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(length = 50)
    private String strategy;
    
    // 거래 전략 타입 - Frontend의 tradingType과 통일
    @Enumerated(EnumType.STRING)
    @Column(name = "trading_strategy", length = 20)
    private TradingStrategy tradingStrategy;
    
    // 진입/청산 시간 필드
    @Column(name = "entry_time")
    private LocalDateTime entryTime;
    
    @Column(name = "exit_time")
    private LocalDateTime exitTime;
    
    // 분석용 계산 필드
    @Column(precision = 20, scale = 8)
    private BigDecimal profitLoss;
    
    @Column(precision = 10, scale = 4)
    private BigDecimal profitLossPercentage;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal averageEntryPrice;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal realizedPnl;
    
    // 리스크 관리 필드
    @Column(precision = 20, scale = 8)
    private BigDecimal stopLoss;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal takeProfit;
    
    @Column(precision = 10, scale = 4)
    private BigDecimal riskRewardRatio;
}