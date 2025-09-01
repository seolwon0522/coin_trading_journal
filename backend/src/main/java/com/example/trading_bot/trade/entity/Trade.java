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
    
    // Binance API 동기화 관련 필드
    @Column(length = 50)
    private String exchange; // "BINANCE", "UPBIT" 등
    
    @Column(name = "exchange_trade_id", length = 100)
    private String exchangeTradeId; // 거래소의 거래 ID (중복 체크용)
    
    @Column(precision = 20, scale = 8)
    private BigDecimal commission; // 수수료
    
    @Column(length = 10)
    private String commissionAsset; // 수수료 자산 (BTC, USDT 등)
    
    @Column
    private Boolean isMaker; // 메이커 여부
    
    @Column(precision = 20, scale = 8)
    private BigDecimal quoteQuantity; // Quote 자산 수량 (USDT 등)
    
    @Column(precision = 20, scale = 8)
    private BigDecimal realizedPnl; // 실현 손익 (Binance 제공)
}