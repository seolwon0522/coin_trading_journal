package com.example.trading_bot.trade.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKeyRequest {
    
    @NotBlank(message = "API 키는 필수입니다")
    @Size(max = 100, message = "API 키는 100자 이내여야 합니다")
    private String apiKey;
    
    @NotBlank(message = "Secret 키는 필수입니다")
    @Size(max = 100, message = "Secret 키는 100자 이내여야 합니다")
    private String secretKey;
    
    @Size(max = 50, message = "키 이름은 50자 이내여야 합니다")
    private String keyName;
    
    private Boolean canTrade;
    
    private Boolean canWithdraw;
}