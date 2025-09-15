package com.example.trading_bot.order.entity;

public enum OrderType {
    MARKET("시장가"),
    LIMIT("지정가"),
    STOP_LOSS("손절매"),
    STOP_LOSS_LIMIT("손절지정가"),
    TAKE_PROFIT("익절매"),
    TAKE_PROFIT_LIMIT("익절지정가"),
    LIMIT_MAKER("메이커지정가");
    
    private final String description;
    
    OrderType(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
    
    // Binance API 타입으로 변환
    public String toBinanceType() {
        return this.name().replace("_", "");
    }
}