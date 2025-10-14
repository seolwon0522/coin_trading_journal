package com.example.trading_bot.strategy.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 백테스트 응답 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BacktestResponse {

    /**
     * 백테스트 ID
     */
    private Long id;

    /**
     * 전략 ID
     */
    private Long strategyId;

    /**
     * 전략 이름
     */
    private String strategyName;

    /**
     * 전략 타입
     */
    private String strategyType;

    /**
     * 심볼
     */
    private String symbol;

    /**
     * 백테스트 기간
     */
    private LocalDate startDate;
    private LocalDate endDate;

    /**
     * 타임프레임
     */
    private String timeframe;

    /**
     * 자본 정보
     */
    private BigDecimal initialCapital;
    private BigDecimal finalCapital;

    /**
     * 거래 통계
     */
    private Integer totalTrades;
    private Integer winningTrades;
    private Integer losingTrades;
    private BigDecimal winRate;  // 승률 (%)

    /**
     * 수익률 지표
     */
    private BigDecimal totalReturn;  // 총 수익률 (%)
    private BigDecimal totalPnl;     // 총 손익 (금액)
    private BigDecimal maxDrawdown;  // 최대 낙폭 (%)
    private BigDecimal sharpeRatio;  // 샤프 비율

    /**
     * 추가 성과 지표
     */
    private BigDecimal avgWin;       // 평균 수익
    private BigDecimal avgLoss;      // 평균 손실
    private BigDecimal profitFactor; // 수익 팩터
    private Integer maxConsecutiveWins;
    private Integer maxConsecutiveLosses;

    /**
     * 상세 결과 데이터 (차트용)
     */
    private Map<String, Object> resultData;

    /**
     * 설명
     */
    private String description;

    /**
     * 생성일시
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    /**
     * Equity curve data for chart
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EquityPoint {
        private LocalDateTime timestamp;
        private BigDecimal equity;
        private BigDecimal drawdown;
    }

    /**
     * Trade details
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeDetail {
        private LocalDateTime entryTime;
        private LocalDateTime exitTime;
        private String side;  // BUY, SELL
        private BigDecimal entryPrice;
        private BigDecimal exitPrice;
        private BigDecimal quantity;
        private BigDecimal pnl;
        private BigDecimal pnlPercent;
    }
}
