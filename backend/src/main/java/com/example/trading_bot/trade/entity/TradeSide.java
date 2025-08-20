package com.example.trading_bot.trade.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TradeSide {
    BUY("매수"),
    SELL("매도");
    
    private final String description;
}