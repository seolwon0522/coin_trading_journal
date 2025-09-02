package com.example.trading_bot.portfolio.entity;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 보유 자산 엔티티
 * 현재 보유중인 암호화폐 자산을 관리합니다.
 */
@Entity
@Table(name = "portfolios", indexes = {
    @Index(name = "idx_portfolio_user_symbol", columnList = "user_id, symbol", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Portfolio extends BaseTimeEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, length = 20)
    private String symbol;  // BTCUSDT, ETHUSDT 등
    
    @Column(nullable = false, length = 10)
    private String asset;  // BTC, ETH 등 (symbol에서 추출)
    
    // 보유 수량 정보
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal quantity;  // 총 보유 수량
    
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal free;  // 사용 가능 수량 (Binance API 필드명)
    
    @Column(nullable = false, precision = 20, scale = 8)
    private BigDecimal locked;  // 잠긴 수량 (Binance API 필드명)
    
    // 매수 가격 정보
    @Column(precision = 20, scale = 8)
    private BigDecimal avgBuyPrice;  // 평균 매수가
    
    @Column(precision = 20, scale = 8)
    private BigDecimal totalInvested;  // 총 투자 금액 (USDT)
    
    // 현재 가격 정보
    @Column(precision = 20, scale = 8)
    private BigDecimal currentPrice;  // 현재가
    
    @Column(precision = 20, scale = 8)
    private BigDecimal currentValue;  // 현재 평가 금액
    
    // 손익 정보
    @Column(precision = 20, scale = 8)
    private BigDecimal unrealizedPnl;  // 미실현 손익
    
    @Column(precision = 10, scale = 4)
    private BigDecimal unrealizedPnlPercent;  // 미실현 손익률 (%)
    
    // 매수 일시 정보
    @Column
    private LocalDateTime firstBuyDate;  // 최초 매수일
    
    @Column
    private LocalDateTime lastBuyDate;  // 최근 매수일
    
    // 동기화 정보
    @Column
    private LocalDateTime lastPriceUpdate;  // 마지막 가격 업데이트
    
    @Column
    private LocalDateTime lastBalanceUpdate;  // 마지막 잔고 업데이트
    
    // 메타 정보
    @Column(columnDefinition = "TEXT")
    private String notes;  // 사용자 메모
    
    @Column
    private Boolean isManualEntry;  // 수동 입력 여부
}