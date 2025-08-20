package com.example.trading_bot.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncResponse {
    
    private Integer syncedCount;
    private String symbol;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime syncedAt;
}