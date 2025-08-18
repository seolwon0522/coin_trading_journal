package com.example.trading_bot.trade.infrastructure.binance.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "binance.api")
@Getter
@Setter
public class BinanceApiConfig {
    
    private String baseUrl = "https://api.binance.com";
    private String wsBaseUrl = "wss://stream.binance.com:9443";
    private boolean testnet = false;
    private String testnetBaseUrl = "https://testnet.binance.vision";
    private String testnetWsBaseUrl = "wss://testnet.binance.vision";
    private int connectTimeout = 10000;
    private int readTimeout = 10000;
    private int retryMaxAttempts = 3;
    private long retryDelay = 1000;
    
    public String getActiveBaseUrl() {
        return testnet ? testnetBaseUrl : baseUrl;
    }
    
    public String getActiveWsBaseUrl() {
        return testnet ? testnetWsBaseUrl : wsBaseUrl;
    }
}