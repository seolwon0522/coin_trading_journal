package com.example.trading_bot.strategy.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 백테스트 결과 엔티티
 */
@Entity
@Table(name = "strategy_backtests", indexes = {
    @Index(name = "idx_backtest_strategy", columnList = "strategy_id"),
    @Index(name = "idx_backtest_created", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Backtest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 연관 전략
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "strategy_id", nullable = false)
    private Strategy strategy;

    /**
     * 백테스트 기간
     */
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    /**
     * 타임프레임
     */
    @Column(name = "timeframe", length = 10)
    private String timeframe;

    /**
     * 자본 정보
     */
    @Column(name = "initial_capital", nullable = false, precision = 12, scale = 2)
    private BigDecimal initialCapital;

    @Column(name = "final_capital", precision = 12, scale = 2)
    private BigDecimal finalCapital;

    /**
     * 거래 통계
     */
    @Column(name = "total_trades")
    private Integer totalTrades;

    @Column(name = "winning_trades")
    private Integer winningTrades;

    @Column(name = "losing_trades")
    private Integer losingTrades;

    /**
     * 성과 지표
     */
    @Column(name = "max_drawdown", precision = 10, scale = 2)
    private BigDecimal maxDrawdown;

    @Column(name = "sharpe_ratio", precision = 5, scale = 2)
    private BigDecimal sharpeRatio;

    @Column(name = "total_return", precision = 10, scale = 2)
    private BigDecimal totalReturn;

    @Column(name = "total_pnl", precision = 12, scale = 2)
    private BigDecimal totalPnl;

    /**
     * 상세 결과 데이터 (JSON)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_data", columnDefinition = "jsonb")
    private Map<String, Object> resultData;

    /**
     * 설명
     */
    @Column(name = "description", length = 500)
    private String description;

    /**
     * 생성일시
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 승률 계산
     */
    public BigDecimal getWinRate() {
        if (totalTrades == null || totalTrades == 0 || winningTrades == null) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(winningTrades)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalTrades), 2, java.math.RoundingMode.HALF_UP);
    }
}
