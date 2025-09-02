package com.example.trading_bot.portfolio.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.portfolio.dto.PortfolioBalanceResponse;
import com.example.trading_bot.portfolio.dto.PortfolioResponse;
import com.example.trading_bot.portfolio.dto.PortfolioSummaryResponse;
import com.example.trading_bot.portfolio.dto.UpdateBuyPriceRequest;
import com.example.trading_bot.portfolio.service.PortfolioManagementService;
import com.example.trading_bot.portfolio.service.PortfolioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
public class PortfolioController {
    
    private final PortfolioManagementService portfolioManagementService;
    private final PortfolioService portfolioService;
    
    /**
     * 실시간 잔고 조회 (Binance API)
     */
    @GetMapping("/balance")
    public ResponseEntity<ApiResponse<PortfolioBalanceResponse>> getBalance(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        PortfolioBalanceResponse balance = portfolioService.getUserBalance(userId);
        
        return ResponseEntity.ok(ApiResponse.success(balance, "잔고 조회 성공"));
    }
    
    /**
     * 포트폴리오 조회 (DB)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PortfolioResponse>>> getPortfolio(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        List<PortfolioResponse> portfolio = portfolioManagementService.getUserPortfolio(userId);
        
        return ResponseEntity.ok(ApiResponse.success(portfolio, "포트폴리오 조회 성공"));
    }
    
    /**
     * 포트폴리오 요약 정보 조회
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PortfolioSummaryResponse>> getPortfolioSummary(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        PortfolioSummaryResponse summary = portfolioManagementService.getPortfolioSummary(userId);
        
        return ResponseEntity.ok(ApiResponse.success(summary, "포트폴리오 요약 조회 성공"));
    }
    
    /**
     * 포트폴리오 동기화
     */
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncPortfolio(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        Map<String, Object> result = portfolioManagementService.syncPortfolio(userId);
        
        return ResponseEntity.ok(ApiResponse.success(result, "포트폴리오 동기화 완료"));
    }
    
    /**
     * 평균 매수가 업데이트
     */
    @PutMapping("/buy-price")
    public ResponseEntity<ApiResponse<PortfolioResponse>> updateBuyPrice(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody UpdateBuyPriceRequest request) {
        
        Long userId = userPrincipal.getId();
        PortfolioResponse updated = portfolioManagementService.updateBuyPrice(userId, request);
        
        return ResponseEntity.ok(ApiResponse.success(updated, "평균 매수가 업데이트 성공"));
    }
    
    /**
     * 현재가 업데이트
     */
    @PostMapping("/update-prices")
    public ResponseEntity<ApiResponse<Void>> updateCurrentPrices(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Long userId = userPrincipal.getId();
        portfolioManagementService.updateCurrentPrices(userId);
        
        return ResponseEntity.ok(ApiResponse.success(null, "현재가 업데이트 완료"));
    }
}
