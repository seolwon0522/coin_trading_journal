package com.example.trading_bot.trade.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 거래 전략 타입
 * Frontend의 tradingType과 통일하기 위한 Enum
 */
@Getter
@RequiredArgsConstructor
public enum TradingStrategy {
    BREAKOUT("돌파", "가격이 특정 레벨을 돌파할 때 진입"),
    TREND("추세추종", "현재 추세 방향으로 진입"),
    COUNTER_TREND("역추세", "추세 반대 방향으로 진입"),
    SCALPING("스캘핑", "짧은 시간 내 작은 수익 추구"),
    SWING("스윙", "중기 변동성을 활용한 거래"),
    POSITION("포지션", "장기 보유 전략");
    
    private final String koreanName;
    private final String description;
}