package com.example.trading_bot.strategy.dto;

import com.example.trading_bot.strategy.entity.Strategy;
import com.example.trading_bot.strategy.entity.StrategyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 전략 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StrategyResponse {

    private Long id;
    private String name;
    private StrategyType type;
    private String symbol;
    private Map<String, Object> params;
    private boolean active;
    private boolean testnet;

    // Performance metrics
    private Integer totalTrades;
    private BigDecimal winRate;
    private BigDecimal totalReturn;
    private BigDecimal maxDrawdown;
    private BigDecimal sharpeRatio;
    private BigDecimal realizedPnl;
    private BigDecimal unrealizedPnl;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime activatedAt;
    private LocalDateTime deactivatedAt;
    private LocalDateTime lastTradeAt;

    private String description;
    private String nautilusStrategyId;

    /**
     * Entity를 DTO로 변환
     */
    public static StrategyResponse from(Strategy strategy) {
        return StrategyResponse.builder()
                .id(strategy.getId())
                .name(strategy.getName())
                .type(strategy.getType())
                .symbol(strategy.getSymbol())
                .params(strategy.getParams())
                .active(strategy.isActive())
                .testnet(strategy.isTestnet())
                .totalTrades(strategy.getTotalTrades())
                .winRate(strategy.getWinRate())
                .totalReturn(strategy.getTotalReturn())
                .maxDrawdown(strategy.getMaxDrawdown())
                .sharpeRatio(strategy.getSharpeRatio())
                .realizedPnl(strategy.getRealizedPnl())
                .unrealizedPnl(strategy.getUnrealizedPnl())
                .createdAt(strategy.getCreatedAt())
                .updatedAt(strategy.getUpdatedAt())
                .activatedAt(strategy.getActivatedAt())
                .deactivatedAt(strategy.getDeactivatedAt())
                .lastTradeAt(strategy.getLastTradeAt())
                .description(strategy.getDescription())
                .nautilusStrategyId(strategy.getNautilusStrategyId())
                .build();
    }

    /**
     * 간단한 성과 요약 문자열 생성
     */
    public String getPerformanceSummary() {
        StringBuilder sb = new StringBuilder();

        if (winRate != null) {
            sb.append("승률: ").append(winRate).append("% ");
        }

        if (totalReturn != null) {
            sb.append("수익률: ").append(totalReturn).append("% ");
        }

        if (totalTrades != null) {
            sb.append("거래수: ").append(totalTrades);
        }

        return sb.toString().trim();
    }

    /**
     * 전략 상태 문자열
     */
    public String getStatusText() {
        if (active) {
            return "실행중";
        } else if (deactivatedAt != null) {
            return "중지됨";
        } else {
            return "대기중";
        }
    }
}