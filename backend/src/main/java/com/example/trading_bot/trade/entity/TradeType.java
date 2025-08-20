package com.example.trading_bot.trade.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TradeType {
    SPOT("현물"),
    FUTURES("선물"),
    MARGIN("마진");
    
    private final String description;
}