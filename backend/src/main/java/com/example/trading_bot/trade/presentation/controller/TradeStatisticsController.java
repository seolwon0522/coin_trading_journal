package com.example.trading_bot.trade.presentation.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.trade.application.dto.TradeStatisticsResponse;
import com.example.trading_bot.trade.application.service.TradeStatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/trades/statistics")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Trade Statistics", description = "거래 통계 API")
public class TradeStatisticsController {
    
    private final TradeStatisticsService statisticsService;
    
    @GetMapping
    @Operation(summary = "거래 통계 조회", description = "특정 기간의 거래 통계를 조회합니다")
    public ResponseEntity<ApiResponse<TradeStatisticsResponse>> getStatistics(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        log.info("Getting statistics for user {} from {} to {}", 
            userPrincipal.getId(), startDate, endDate);
        
        TradeStatisticsResponse response = statisticsService.getStatistics(
            userPrincipal.getId(), startDate, endDate
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/monthly")
    @Operation(summary = "월별 통계 조회", description = "특정 월의 거래 통계를 조회합니다")
    public ResponseEntity<ApiResponse<TradeStatisticsResponse>> getMonthlyStatistics(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam int year,
        @RequestParam int month
    ) {
        LocalDateTime startDate = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime endDate = startDate.plusMonths(1).minusSeconds(1);
        
        log.info("Getting monthly statistics for user {} for {}/{}", 
            userPrincipal.getId(), year, month);
        
        TradeStatisticsResponse response = statisticsService.getStatistics(
            userPrincipal.getId(), startDate, endDate
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/yearly")
    @Operation(summary = "연간 통계 조회", description = "특정 연도의 거래 통계를 조회합니다")
    public ResponseEntity<ApiResponse<TradeStatisticsResponse>> getYearlyStatistics(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam int year
    ) {
        LocalDateTime startDate = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime endDate = LocalDateTime.of(year, 12, 31, 23, 59, 59);
        
        log.info("Getting yearly statistics for user {} for {}", 
            userPrincipal.getId(), year);
        
        TradeStatisticsResponse response = statisticsService.getStatistics(
            userPrincipal.getId(), startDate, endDate
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/today")
    @Operation(summary = "오늘 통계 조회", description = "오늘의 거래 통계를 조회합니다")
    public ResponseEntity<ApiResponse<TradeStatisticsResponse>> getTodayStatistics(
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        LocalDate today = LocalDate.now();
        LocalDateTime startDate = today.atStartOfDay();
        LocalDateTime endDate = today.atTime(LocalTime.MAX);
        
        log.info("Getting today's statistics for user {}", userPrincipal.getId());
        
        TradeStatisticsResponse response = statisticsService.getStatistics(
            userPrincipal.getId(), startDate, endDate
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/this-week")
    @Operation(summary = "이번 주 통계 조회", description = "이번 주의 거래 통계를 조회합니다")
    public ResponseEntity<ApiResponse<TradeStatisticsResponse>> getThisWeekStatistics(
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1);
        LocalDate endOfWeek = startOfWeek.plusDays(6);
        
        LocalDateTime startDate = startOfWeek.atStartOfDay();
        LocalDateTime endDate = endOfWeek.atTime(LocalTime.MAX);
        
        log.info("Getting this week's statistics for user {}", userPrincipal.getId());
        
        TradeStatisticsResponse response = statisticsService.getStatistics(
            userPrincipal.getId(), startDate, endDate
        );
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}