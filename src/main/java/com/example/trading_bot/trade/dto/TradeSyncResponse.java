package com.example.trading_bot.trade.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 거래 동기화 응답 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeSyncResponse {
    
    // 처리된 총 거래 수
    private int totalProcessed;
    
    // 새로 추가된 거래 수
    private int newTrades;
    
    // 중복으로 제외된 거래 수
    private int duplicates;
    
    // 동기화 중 발생한 오류 목록
    private List<String> errors;
    
    // 동기화 시간
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime syncTime;
    
    // 수동 입력 거래 수 (병합 시 사용)
    private Integer totalManualTrades;
    
    // API 동기화 거래 수 (병합 시 사용)
    private Integer totalApiTrades;
    
    // 잠재적 중복 거래 수 (병합 시 사용)
    private Integer potentialDuplicates;
    
    // 마지막 동기화 시간
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastSyncTime;
    
    // 동기화 결과 메시지
    private String message;
}