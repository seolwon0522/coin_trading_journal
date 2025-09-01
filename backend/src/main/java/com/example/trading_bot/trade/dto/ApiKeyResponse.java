package com.example.trading_bot.trade.dto;

import com.example.trading_bot.trade.entity.UserApiKey;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * API 키 응답 DTO
 * 보안상 시크릿 키는 절대 포함하지 않음
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKeyResponse {
    
    private Long id;
    
    private String exchange;
    
    private String keyName;
    
    // API 키는 마스킹 처리하여 일부만 표시
    private String apiKeyMasked;
    
    private Boolean isActive;
    
    private Boolean canTrade;
    
    private Boolean canWithdraw;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastUsedAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastSyncAt;
    
    private Integer syncFailureCount;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    
    /**
     * Entity를 Response DTO로 변환
     * 
     * @param apiKey UserApiKey 엔티티
     * @return ApiKeyResponse DTO
     */
    public static ApiKeyResponse from(UserApiKey apiKey) {
        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .exchange(apiKey.getExchange())
                .keyName(apiKey.getKeyName())
                .apiKeyMasked(maskApiKey(apiKey.getApiKey()))
                .isActive(apiKey.getIsActive())
                .canTrade(apiKey.getCanTrade())
                .canWithdraw(apiKey.getCanWithdraw())
                .lastUsedAt(apiKey.getLastUsedAt())
                .lastSyncAt(apiKey.getLastSyncAt())
                .syncFailureCount(apiKey.getSyncFailureCount())
                .createdAt(apiKey.getCreatedAt())
                .build();
    }
    
    /**
     * API 키 마스킹 처리
     * 앞 6자리와 뒤 4자리만 표시하고 나머지는 * 처리
     * 
     * @param apiKey 원본 API 키
     * @return 마스킹된 API 키
     */
    private static String maskApiKey(String apiKey) {
        if (apiKey == null || apiKey.length() < 10) {
            return "****";
        }
        
        int length = apiKey.length();
        String prefix = apiKey.substring(0, 6);
        String suffix = apiKey.substring(length - 4);
        String masked = "*".repeat(Math.max(0, length - 10));
        
        return prefix + masked + suffix;
    }
}