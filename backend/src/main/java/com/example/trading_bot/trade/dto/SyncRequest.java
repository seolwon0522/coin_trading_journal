package com.example.trading_bot.trade.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncRequest {
    
    @NotNull(message = "API 키 ID는 필수입니다")
    private Long apiKeyId;
    
    @NotBlank(message = "심볼은 필수입니다")
    private String symbol;
    
    private LocalDateTime startTime;
    
    private LocalDateTime endTime;
}