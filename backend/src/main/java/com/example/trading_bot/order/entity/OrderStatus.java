package com.example.trading_bot.order.entity;

public enum OrderStatus {
    PENDING("대기중"),
    SUBMITTED("제출됨"),
    PARTIALLY_FILLED("부분체결"),
    FILLED("체결완료"),
    CANCELLED("취소됨"),
    REJECTED("거부됨"),
    EXPIRED("만료됨"),
    FAILED("실패");
    
    private final String description;
    
    OrderStatus(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}