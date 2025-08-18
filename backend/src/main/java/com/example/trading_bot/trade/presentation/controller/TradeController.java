package com.example.trading_bot.trade.presentation.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.trade.application.dto.*;
import com.example.trading_bot.trade.application.service.TradeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Trade Management", description = "거래 관리 API")
public class TradeController {
    
    private final TradeService tradeService;
    
    @PostMapping
    @Operation(summary = "거래 생성", description = "새로운 거래를 수동으로 생성합니다")
    public ResponseEntity<ApiResponse<TradeResponse>> createTrade(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @Valid @RequestBody CreateTradeRequest request
    ) {
        log.info("Creating trade for user: {}", userPrincipal.getId());
        TradeResponse response = tradeService.createManualTrade(userPrincipal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "거래가 성공적으로 생성되었습니다"));
    }
    
    @PutMapping("/{tradeId}")
    @Operation(summary = "거래 수정", description = "기존 거래 정보를 수정합니다")
    public ResponseEntity<ApiResponse<TradeResponse>> updateTrade(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable Long tradeId,
        @Valid @RequestBody UpdateTradeRequest request
    ) {
        log.info("Updating trade {} for user: {}", tradeId, userPrincipal.getId());
        TradeResponse response = tradeService.updateTrade(userPrincipal.getId(), tradeId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "거래가 성공적으로 수정되었습니다"));
    }
    
    @DeleteMapping("/{tradeId}")
    @Operation(summary = "거래 삭제", description = "거래를 삭제합니다")
    public ResponseEntity<ApiResponse<Void>> deleteTrade(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable Long tradeId
    ) {
        log.info("Deleting trade {} for user: {}", tradeId, userPrincipal.getId());
        tradeService.deleteTrade(userPrincipal.getId(), tradeId);
        return ResponseEntity.ok(ApiResponse.success(null, "거래가 성공적으로 삭제되었습니다"));
    }
    
    @GetMapping("/{tradeId}")
    @Operation(summary = "거래 조회", description = "특정 거래를 조회합니다")
    public ResponseEntity<ApiResponse<TradeResponse>> getTrade(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable Long tradeId
    ) {
        TradeResponse response = tradeService.getTrade(userPrincipal.getId(), tradeId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping
    @Operation(summary = "거래 목록 조회", description = "사용자의 거래 목록을 조회합니다")
    public ResponseEntity<ApiResponse<Page<TradeResponse>>> getTrades(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "executedAt") String sortBy,
        @RequestParam(defaultValue = "DESC") String direction
    ) {
        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        
        Page<TradeResponse> response = tradeService.getUserTrades(userPrincipal.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/date-range")
    @Operation(summary = "기간별 거래 조회", description = "특정 기간의 거래를 조회합니다")
    public ResponseEntity<ApiResponse<Page<TradeResponse>>> getTradesByDateRange(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "executedAt") String sortBy,
        @RequestParam(defaultValue = "DESC") String direction
    ) {
        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        
        Page<TradeResponse> response = tradeService.getUserTradesByDateRange(
            userPrincipal.getId(), startDate, endDate, pageable
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/symbol/{symbol}")
    @Operation(summary = "심볼별 거래 조회", description = "특정 심볼의 거래를 조회합니다")
    public ResponseEntity<ApiResponse<Page<TradeResponse>>> getTradesBySymbol(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @PathVariable String symbol,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "executedAt") String sortBy,
        @RequestParam(defaultValue = "DESC") String direction
    ) {
        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        
        Page<TradeResponse> response = tradeService.getUserTradesBySymbol(
            userPrincipal.getId(), symbol, pageable
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/recent")
    @Operation(summary = "최근 거래 조회", description = "최근 거래를 조회합니다")
    public ResponseEntity<ApiResponse<List<TradeResponse>>> getRecentTrades(
        @AuthenticationPrincipal UserPrincipal userPrincipal,
        @RequestParam(defaultValue = "10") int limit
    ) {
        List<TradeResponse> response = tradeService.getRecentTrades(userPrincipal.getId(), limit);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @GetMapping("/symbols")
    @Operation(summary = "거래 심볼 목록", description = "사용자가 거래한 심볼 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<String>>> getUserSymbols(
        @AuthenticationPrincipal UserPrincipal userPrincipal
    ) {
        List<String> symbols = tradeService.getUserSymbols(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(symbols));
    }
}