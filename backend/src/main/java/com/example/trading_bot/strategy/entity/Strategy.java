package com.example.trading_bot.strategy.entity;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 자동매매 전략 엔티티
 */
@Entity
@Table(name = "strategies")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Strategy extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "strategy_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private StrategyType type;

    @Column(nullable = false, length = 20)
    private String symbol;  // e.g., "BTCUSDT"

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> params;

    @Column(name = "is_active")
    private boolean active;

    @Column(name = "is_testnet")
    @Builder.Default
    private boolean testnet = true;

    // Performance metrics
    @Column(name = "total_trades")
    @Builder.Default
    private Integer totalTrades = 0;

    @Column(name = "win_rate", precision = 5, scale = 2)
    private BigDecimal winRate;

    @Column(name = "total_return", precision = 10, scale = 2)
    private BigDecimal totalReturn;

    @Column(name = "max_drawdown", precision = 10, scale = 2)
    private BigDecimal maxDrawdown;

    @Column(name = "sharpe_ratio", precision = 5, scale = 2)
    private BigDecimal sharpeRatio;

    @Column(name = "realized_pnl", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal realizedPnl = BigDecimal.ZERO;

    @Column(name = "unrealized_pnl", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal unrealizedPnl = BigDecimal.ZERO;

    // Tracking fields
    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "last_trade_at")
    private LocalDateTime lastTradeAt;

    @Column(length = 500)
    private String description;

    // Nautilus integration
    @Column(name = "nautilus_strategy_id", unique = true)
    private String nautilusStrategyId;

    /**
     * 전략 활성화
     */
    public void activate() {
        this.active = true;
        this.activatedAt = LocalDateTime.now();
        this.deactivatedAt = null;
    }

    /**
     * 전략 비활성화
     */
    public void deactivate() {
        this.active = false;
        this.deactivatedAt = LocalDateTime.now();
    }

    /**
     * 성과 지표 업데이트
     */
    public void updatePerformanceMetrics(BigDecimal winRate, BigDecimal totalReturn,
                                        BigDecimal maxDrawdown, BigDecimal sharpeRatio) {
        this.winRate = winRate;
        this.totalReturn = totalReturn;
        this.maxDrawdown = maxDrawdown;
        this.sharpeRatio = sharpeRatio;
    }

    /**
     * PnL 업데이트
     */
    public void updatePnl(BigDecimal realizedPnl, BigDecimal unrealizedPnl) {
        this.realizedPnl = realizedPnl;
        this.unrealizedPnl = unrealizedPnl;
    }

    /**
     * 거래 실행 기록
     */
    public void recordTrade() {
        this.totalTrades = (this.totalTrades != null ? this.totalTrades : 0) + 1;
        this.lastTradeAt = LocalDateTime.now();
    }
}