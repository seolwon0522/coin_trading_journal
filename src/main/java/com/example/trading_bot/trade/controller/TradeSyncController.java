package com.example.trading_bot.trade.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.trade.dto.TradeSyncRequest;
import com.example.trading_bot.trade.dto.TradeSyncResponse;
import com.example.trading_bot.trade.service.TradeSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 거래 동기화 REST 컨트롤러
 * Binance API를 통해 거래 내역을 가져오는 엔드포인트를 제공합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/trades/sync")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Trade Sync", description = "거래 동기화 API")
public class TradeSyncController {
    
    private final TradeSyncService tradeSyncService;
    
    /**
     * Binance 거래 내역 동기화
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @param request 동기화 요청 정보
     * @return 동기화 결과
     */
    @PostMapping("/binance")
    @Operation(summary = "Binance 거래 동기화", description = "Binance API를 통해 거래 내역을 가져옵니다")
    public ResponseEntity<ApiResponse<TradeSyncResponse>> syncBinanceTrades(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody TradeSyncRequest request) {
        
        log.info("Binance 거래 동기화 요청: userId={}, symbols={}", 
                userPrincipal.getId(), request.getSymbols());
        
        TradeSyncResponse response = tradeSyncService.syncBinanceTrades(
                userPrincipal.getId(), 
                request
        );
        
        if (response.getErrors().isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                    response,
                    String.format("동기화 완료: %d개 새로 추가", response.getNewTrades())
            ));
        } else {
            return ResponseEntity.ok(ApiResponse.error(
                    "일부 동기화 실패",
                    response
            ));
        }
    }
    
    /**
     * 빠른 동기화 (최근 24시간)
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @return 동기화 결과
     */
    @PostMapping("/binance/quick")
    @Operation(summary = "빠른 Binance 동기화", description = "최근 24시간의 거래 내역을 가져옵니다")
    public ResponseEntity<ApiResponse<TradeSyncResponse>> quickSyncBinanceTrades(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("빠른 Binance 동기화 요청: userId={}", userPrincipal.getId());
        
        TradeSyncResponse response = tradeSyncService.quickSync(userPrincipal.getId());
        
        return ResponseEntity.ok(ApiResponse.success(
                response,
                String.format("최근 24시간 동기화 완료: %d개 새로 추가", response.getNewTrades())
        ));
    }
}