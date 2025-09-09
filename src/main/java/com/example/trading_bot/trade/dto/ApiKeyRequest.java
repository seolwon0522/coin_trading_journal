package com.example.trading_bot.trade.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API 키 등록/수정 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKeyRequest {
    
    @NotBlank(message = "거래소명은 필수입니다")
    @Pattern(regexp = "^(BINANCE|UPBIT|BITHUMB)$", message = "지원하지 않는 거래소입니다")
    private String exchange;
    
    @NotBlank(message = "API 키는 필수입니다")
    @Size(min = 20, max = 100, message = "API 키는 20-100자 사이여야 합니다")
    private String apiKey;
    
    @NotBlank(message = "시크릿 키는 필수입니다")
    @Size(min = 20, max = 100, message = "시크릿 키는 20-100자 사이여야 합니다")
    private String secretKey;
    
    @Size(max = 50, message = "키 이름은 50자 이하여야 합니다")
    private String keyName;
    
    private Boolean isActive;
    
    private Boolean canTrade;
    
    // 검증용 필드 (프론트엔드에서 재확인용)
    private String secretKeyConfirm;
}