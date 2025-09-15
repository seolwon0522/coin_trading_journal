package com.example.trading_bot.order.entity;

public enum OrderSide {
    BUY("매수"),
    SELL("매도");
    
    private final String description;
    
    OrderSide(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}