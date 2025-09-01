package com.example.trading_bot.portfolio.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.portfolio.dto.PortfolioBalanceResponse;
import com.example.trading_bot.portfolio.service.PortfolioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 포트폴리오 관리 REST 컨트롤러
 * 사용자의 자산 정보를 조회하고 관리하는 엔드포인트를 제공합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/portfolio")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Portfolio Management", description = "포트폴리오 관리 API")
public class PortfolioController {
    
    private final PortfolioService portfolioService;
    
    /**
     * 포트폴리오 잔고 조회
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @return 포트폴리오 잔고 정보
     */
    @GetMapping("/balance")
    @Operation(summary = "포트폴리오 잔고 조회", description = "사용자의 Binance 계정 잔고를 조회합니다")
    public ResponseEntity<ApiResponse<PortfolioBalanceResponse>> getBalance(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("포트폴리오 잔고 조회 요청: userId={}", userPrincipal.getId());
        
        PortfolioBalanceResponse balance = portfolioService.getUserBalance(userPrincipal.getId());
        
        return ResponseEntity.ok(ApiResponse.success(balance, "포트폴리오 조회 성공"));
    }
    
    /**
     * 포트폴리오 새로고침
     * 
     * @param userPrincipal 인증된 사용자 정보
     * @return 새로고침된 포트폴리오 정보
     */
    @PostMapping("/refresh")
    @Operation(summary = "포트폴리오 새로고침", description = "포트폴리오 정보를 강제로 새로고침합니다")
    public ResponseEntity<ApiResponse<PortfolioBalanceResponse>> refreshBalance(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("포트폴리오 새로고침 요청: userId={}", userPrincipal.getId());
        
        // 현재는 단순히 재조회 (추후 캐싱 구현 시 캐시 무효화 로직 추가)
        PortfolioBalanceResponse balance = portfolioService.getUserBalance(userPrincipal.getId());
        
        return ResponseEntity.ok(ApiResponse.success(balance, "포트폴리오 새로고침 완료"));
    }
}