package com.example.trading_bot.strategy.dto;

import com.example.trading_bot.strategy.entity.StrategyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 전략 생성/수정 요청 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StrategyRequest {

    @NotBlank(message = "전략 이름은 필수입니다")
    @Size(min = 2, max = 100, message = "전략 이름은 2-100자 사이여야 합니다")
    private String name;

    @NotNull(message = "전략 타입은 필수입니다")
    private StrategyType type;

    @NotBlank(message = "심볼은 필수입니다")
    private String symbol;

    @NotNull(message = "전략 파라미터는 필수입니다")
    private Map<String, Object> params;

    private String description;

    @Builder.Default
    private Boolean testnet = true;  // 기본값: 테스트넷

    /**
     * 기본 EMA Cross 파라미터 생성
     */
    public static StrategyRequest createDefaultEmaCross() {
        return StrategyRequest.builder()
                .name("EMA Cross Strategy")
                .type(StrategyType.EMA_CROSS)
                .symbol("BTCUSDT")
                .params(Map.of(
                        "trade_size", "0.001",
                        "fast_ema_period", 10,
                        "slow_ema_period", 20,
                        "use_bracket_orders", true,
                        "stop_loss_pct", "0.02",
                        "take_profit_pct", "0.05"
                ))
                .description("10/20 EMA 교차 전략")
                .testnet(true)
                .build();
    }

    /**
     * 기본 Market Maker 파라미터 생성
     */
    public static StrategyRequest createDefaultMarketMaker() {
        return StrategyRequest.builder()
                .name("Volatility Market Maker")
                .type(StrategyType.MARKET_MAKER)
                .symbol("ETHUSDT")
                .params(Map.of(
                        "trade_size", "0.01",
                        "atr_period", 20,
                        "atr_multiple", 6.0,
                        "max_inventory", "0.1",
                        "spread_multiplier", 1.0,
                        "max_orders_per_side", 2
                ))
                .description("ATR 기반 변동성 마켓 메이킹")
                .testnet(true)
                .build();
    }

    /**
     * 기본 Orderbook Imbalance 파라미터 생성
     */
    public static StrategyRequest createDefaultOrderbookImbalance() {
        return StrategyRequest.builder()
                .name("Orderbook Imbalance HFT")
                .type(StrategyType.ORDERBOOK_IMBALANCE)
                .symbol("BTCUSDT")
                .params(Map.of(
                        "trade_size", "0.001",
                        "book_depth", 10,
                        "imbalance_threshold", 0.6,
                        "min_volume_ratio", 2.0,
                        "entry_threshold", 2.0,
                        "exit_threshold", 0.5,
                        "min_holding_secs", 5,
                        "max_holding_secs", 300
                ))
                .description("오더북 불균형 고빈도 매매")
                .testnet(true)
                .build();
    }
}