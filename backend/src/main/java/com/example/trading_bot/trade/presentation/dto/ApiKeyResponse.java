package com.example.trading_bot.trade.presentation.dto;

import com.example.trading_bot.trade.domain.entity.UserApiKey;
import com.example.trading_bot.trade.infrastructure.security.CryptoService;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKeyResponse {
    
    private Long id;
    private String exchange;
    private String apiKey;
    private String maskedApiKey;
    private String keyName;
    private Boolean isActive;
    private Boolean canTrade;
    private Boolean canWithdraw;
    private LocalDateTime lastUsedAt;
    private LocalDateTime lastSyncAt;
    private LocalDateTime createdAt;
    
    public static ApiKeyResponse from(UserApiKey apiKey, CryptoService cryptoService) {
        return ApiKeyResponse.builder()
            .id(apiKey.getId())
            .exchange(apiKey.getExchange())
            .apiKey(apiKey.getApiKey())
            .maskedApiKey(cryptoService.maskApiKey(apiKey.getApiKey()))
            .keyName(apiKey.getKeyName())
            .isActive(apiKey.getIsActive())
            .canTrade(apiKey.getCanTrade())
            .canWithdraw(apiKey.getCanWithdraw())
            .lastUsedAt(apiKey.getLastUsedAt())
            .lastSyncAt(apiKey.getLastSyncAt())
            .createdAt(apiKey.getCreatedAt())
            .build();
    }
}