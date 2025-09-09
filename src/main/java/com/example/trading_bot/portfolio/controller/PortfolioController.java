package com.example.trading_bot.portfolio.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.portfolio.dto.PortfolioBalanceResponse;
import com.example.trading_bot.portfolio.dto.PortfolioResponse;
import com.example.trading_bot.portfolio.dto.PortfolioSummaryResponse;
import com.example.trading_bot.portfolio.dto.UpdateBuyPriceRequest;
import com.example.trading_bot.portfolio.entity.Portfolio;
import com.example.trading_bot.portfolio.service.PortfolioQueryService;
import com.example.trading_bot.portfolio.service.PortfolioRealtimeService;
import com.example.trading_bot.portfolio.service.PortfolioSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 포트폴리오 컨트롤러
 * - 실시간 조회, DB 조회, 동기화를 명확히 분리
 * - Hybrid Real-time Pattern 구현
 */
@Slf4j
@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {
    
    private final PortfolioRealtimeService realtimeService;  // 실시간 조회
    private final PortfolioQueryService queryService;        // DB 조회
    private final PortfolioSyncService syncService;          // DB 동기화
    
    /**
     * 실시간 잔고 조회 (Binance API 직접 호출)
     * - 항상 최신 데이터 반환
     * - 백그라운드로 DB 자동 동기화
     */
    @GetMapping("/balance")
    public ResponseEntity<ApiResponse<PortfolioBalanceResponse>> getRealtimeBalance(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        log.debug("실시간 잔고 조회 요청: userId={}", userId);
        
        PortfolioBalanceResponse balance = realtimeService.getRealtimeBalance(userId);
        
        return ResponseEntity.ok(ApiResponse.success(balance, "실시간 잔고 조회 성공"));
    }
    
    /**
     * 실시간 잔고 조회 (더 명확한 엔드포인트)
     * /realtime 경로도 지원
     */
    @GetMapping("/realtime")
    public ResponseEntity<ApiResponse<PortfolioBalanceResponse>> getRealtime(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return getRealtimeBalance(userPrincipal);
    }
    
    /**
     * DB에 저장된 포트폴리오 조회
     * - 캐시된 데이터 (차트, 히스토리 용도)
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<PortfolioResponse>>> getPortfolioHistory(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        log.debug("포트폴리오 히스토리 조회: userId={}", userId);
        
        List<PortfolioResponse> portfolio = queryService.getPortfolioFromDB(userId);
        
        if (portfolio.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(
                portfolio, 
                "포트폴리오가 비어있습니다. 먼저 동기화를 실행해주세요."
            ));
        }
        
        return ResponseEntity.ok(ApiResponse.success(portfolio, "포트폴리오 조회 성공"));
    }
    
    /**
     * 포트폴리오 요약 정보 조회 (DB 기반)
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PortfolioSummaryResponse>> getPortfolioSummary(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        PortfolioSummaryResponse summary = queryService.getPortfolioSummary(userId);
        
        return ResponseEntity.ok(ApiResponse.success(summary, "포트폴리오 요약 조회 성공"));
    }
    
    /**
     * 수동 포트폴리오 동기화
     * - 강제로 DB 업데이트
     * - 명시적 동기화가 필요할 때 사용
     */
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncPortfolio(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        log.info("수동 포트폴리오 동기화 요청: userId={}", userId);
        
        Map<String, Object> result = syncService.syncNow(userId);
        
        return ResponseEntity.ok(ApiResponse.success(result, "포트폴리오 동기화 완료"));
    }
    
    /**
     * 평균 매수가 업데이트
     * - 사용자가 직접 매수가 입력
     */
    @PutMapping("/buy-price")
    public ResponseEntity<ApiResponse<Portfolio>> updateBuyPrice(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody UpdateBuyPriceRequest request) {
        
        Long userId = userPrincipal.getId();
        log.info("평균 매수가 업데이트: userId={}, symbol={}", userId, request.getSymbol());
        
        Portfolio updated = syncService.updateBuyPrice(userId, request);
        
        return ResponseEntity.ok(ApiResponse.success(updated, "평균 매수가 업데이트 성공"));
    }
    
    /**
     * 현재가만 업데이트 (DB의 가격 정보만 갱신)
     * - 잔고는 그대로, 가격만 업데이트
     */
    @PostMapping("/update-prices")
    public ResponseEntity<ApiResponse<Void>> updateCurrentPrices(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        log.debug("현재가 업데이트 요청: userId={}", userId);
        
        syncService.updatePricesOnly(userId);
        
        return ResponseEntity.ok(ApiResponse.success(null, "현재가 업데이트 완료"));
    }
    
    /**
     * 포트폴리오 데이터 최신성 확인
     * - 프론트엔드에서 캐시 여부 판단용
     */
    @GetMapping("/is-fresh")
    public ResponseEntity<ApiResponse<Boolean>> checkDataFreshness(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        boolean isFresh = queryService.isPortfolioDataFresh(userId);
        
        String message = isFresh ? "데이터가 최신입니다" : "데이터가 5분 이상 지났습니다";
        return ResponseEntity.ok(ApiResponse.success(isFresh, message));
    }
}