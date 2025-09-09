package com.example.trading_bot.binance.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class BinanceAccountResponse {
    
    @JsonProperty("makerCommission")
    private Integer makerCommission;
    
    @JsonProperty("takerCommission")
    private Integer takerCommission;
    
    @JsonProperty("buyerCommission")
    private Integer buyerCommission;
    
    @JsonProperty("sellerCommission")
    private Integer sellerCommission;
    
    @JsonProperty("canTrade")
    private Boolean canTrade;
    
    @JsonProperty("canWithdraw")
    private Boolean canWithdraw;
    
    @JsonProperty("canDeposit")
    private Boolean canDeposit;
    
    @JsonProperty("updateTime")
    private Long updateTime;
    
    @JsonProperty("accountType")
    private String accountType;
    
    @JsonProperty("balances")
    private List<Balance> balances;
    
    @JsonProperty("permissions")
    private List<String> permissions;
    
    @Data
    public static class Balance {
        @JsonProperty("asset")
        private String asset;
        
        @JsonProperty("free")
        private String free;
        
        @JsonProperty("locked")
        private String locked;
    }
}