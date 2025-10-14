package com.example.trading_bot.strategy.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

/**
 * 백테스트 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BacktestRequest {

    /**
     * 전략 ID (기존 전략 사용)
     */
    @NotNull(message = "전략 ID는 필수입니다")
    private Long strategyId;

    /**
     * 백테스트 시작일
     */
    @NotNull(message = "시작일은 필수입니다")
    @PastOrPresent(message = "시작일은 현재 또는 과거여야 합니다")
    private LocalDate startDate;

    /**
     * 백테스트 종료일
     */
    @NotNull(message = "종료일은 필수입니다")
    @PastOrPresent(message = "종료일은 현재 또는 과거여야 합니다")
    private LocalDate endDate;

    /**
     * 초기 자본
     */
    @NotNull(message = "초기 자본은 필수입니다")
    @DecimalMin(value = "0.0", inclusive = false, message = "초기 자본은 0보다 커야 합니다")
    private BigDecimal initialCapital;

    /**
     * 타임프레임 (1m, 5m, 15m, 1h, 4h, 1d)
     */
    @NotBlank(message = "타임프레임은 필수입니다")
    @Pattern(regexp = "^(1m|5m|15m|30m|1h|4h|1d)$", message = "유효하지 않은 타임프레임입니다")
    private String timeframe;

    /**
     * 추가 파라미터 (선택사항)
     */
    private Map<String, Object> additionalParams;

    /**
     * 설명
     */
    @Size(max = 500, message = "설명은 500자를 초과할 수 없습니다")
    private String description;
}
