package com.example.trading_bot.trade.entity;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Entity
@Table(name = "trades")
@Getter
@Setter
@NoArgsConstructor
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
    
    @Column(nullable = false, length = 4)
    private String side; // "BUY" or "SELL"
    
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal entryPrice;
    
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal entryQuantity;
    
    @Column(name = "entry_time", nullable = false)
    private LocalDateTime entryTime;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal exitPrice;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal exitQuantity;
    
    @Column(name = "exit_time")
    private LocalDateTime exitTime;
    
    @Column(precision = 20, scale = 8)
    private BigDecimal pnl;
    
    @Column(precision = 10, scale = 4)
    private BigDecimal pnlPercent;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
}