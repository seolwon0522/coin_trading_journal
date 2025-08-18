package com.example.trading_bot.trade.domain.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TradeStatus {
    PENDING("대기중"),
    EXECUTED("체결됨"),
    PARTIALLY_FILLED("부분체결"),
    CANCELLED("취소됨"),
    FAILED("실패");
    
    private final String description;
}