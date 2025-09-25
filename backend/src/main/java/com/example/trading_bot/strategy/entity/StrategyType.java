package com.example.trading_bot.strategy.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 자동매매 전략 타입
 */
@Getter
@RequiredArgsConstructor
public enum StrategyType {
    EMA_CROSS("EMA Cross", "지수이동평균선 교차 전략"),
    MARKET_MAKER("Market Maker", "변동성 기반 마켓 메이킹 전략"),
    ORDERBOOK_IMBALANCE("Orderbook Imbalance", "오더북 불균형 기반 고빈도 매매");

    private final String displayName;
    private final String description;

    /**
     * Nautilus Python 서비스에서 사용하는 값으로 변환
     */
    public String toNautilusType() {
        return this.name().toLowerCase();
    }
}