package com.example.trading_bot.trade.presentation.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
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