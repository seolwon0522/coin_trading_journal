package com.example.trading_bot.binance.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class BinanceTradeResponse {
    
    @JsonProperty("symbol")
    private String symbol;
    
    @JsonProperty("id")
    private Long id;
    
    @JsonProperty("orderId")
    private Long orderId;
    
    @JsonProperty("orderListId")
    private Long orderListId;
    
    @JsonProperty("price")
    private BigDecimal price;
    
    @JsonProperty("qty")
    private BigDecimal quantity;
    
    @JsonProperty("quoteQty")
    private BigDecimal quoteQuantity;
    
    @JsonProperty("commission")
    private BigDecimal commission;
    
    @JsonProperty("commissionAsset")
    private String commissionAsset;
    
    @JsonProperty("time")
    private Long time;
    
    @JsonProperty("isBuyer")
    private Boolean isBuyer;
    
    @JsonProperty("isMaker")
    private Boolean isMaker;
    
    @JsonProperty("isBestMatch")
    private Boolean isBestMatch;
}