package com.example.trading_bot.trade.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum TradeSource {
    MANUAL("수동입력"),
    BINANCE("바이낸스"),
    BOT("자동매매봇");
    
    private final String description;
}