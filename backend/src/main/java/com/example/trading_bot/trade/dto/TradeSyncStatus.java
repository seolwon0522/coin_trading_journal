package com.example.trading_bot.trade.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 거래 동기화 상태 DTO (비동기 처리 시 사용)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeSyncStatus {
    
    public enum Status {
        NOT_FOUND,
        IN_PROGRESS,
        COMPLETED,
        FAILED
    }
    
    // 동기화 작업 ID
    private String syncId;
    
    // 현재 상태
    private Status status;
    
    // 상태 메시지
    private String message;
    
    // 진행률 (0-100)
    private int progress;
    
    // 타임스탬프
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime timestamp;
}