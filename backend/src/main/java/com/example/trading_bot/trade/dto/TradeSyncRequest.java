package com.example.trading_bot.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 거래 동기화 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TradeSyncRequest {
    
    // 동기화할 심볼 목록 (null이면 기본 심볼 사용)
    private List<String> symbols;
    
    // 시작 시간 (milliseconds, null이면 제한 없음)
    private Long startTime;
    
    // 종료 시간 (milliseconds, null이면 현재까지)
    private Long endTime;
    
    // 가져올 거래 개수 제한 (기본값: 500, 최대: 1000)
    private Integer limit;
}