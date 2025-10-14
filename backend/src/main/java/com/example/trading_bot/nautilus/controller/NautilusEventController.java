package com.example.trading_bot.nautilus.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.trade.dto.TradeResponse;
import com.example.trading_bot.trade.service.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Nautilus 이벤트 조회 컨트롤러
 * - Nautilus에서 생성된 거래 내역 조회
 * - 전략별 거래 조회
 */
@Slf4j
@RestController
@RequestMapping("/api/nautilus")
@RequiredArgsConstructor
public class NautilusEventController {

    private final TradeService tradeService;

    /**
     * 특정 전략의 모든 거래 조회
     *
     * @param strategyId 전략 ID
     * @return 거래 목록
     */
    @GetMapping("/strategies/{strategyId}/trades")
    public ResponseEntity<ApiResponse<List<TradeResponse>>> getStrategyTrades(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId) {

        Long userId = userPrincipal.getId();
        log.info("전략 거래 조회: userId={}, strategyId={}", userId, strategyId);

        List<TradeResponse> trades = tradeService.getTradesByStrategy(userId, strategyId);

        return ResponseEntity.ok(ApiResponse.success(trades,
                String.format("%d개 거래 조회 완료", trades.size())));
    }

    /**
     * 사용자의 모든 자동매매 거래 조회
     *
     * @return 거래 목록
     */
    @GetMapping("/trades")
    public ResponseEntity<ApiResponse<List<TradeResponse>>> getAllNautilusTrades(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        Long userId = userPrincipal.getId();
        log.info("Nautilus 거래 조회: userId={}", userId);

        List<TradeResponse> trades = tradeService.getTradesByType(userId, "AUTO");

        return ResponseEntity.ok(ApiResponse.success(trades,
                String.format("%d개 자동매매 거래 조회 완료", trades.size())));
    }
}
