package com.example.trading_bot.nautilus.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.nautilus.NautilusClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Nautilus 트레이딩 엔진 API 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/nautilus")
@RequiredArgsConstructor
public class NautilusController {

    private final NautilusClient nautilusClient;

    /**
     * Nautilus 서비스 헬스체크
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        boolean healthy = nautilusClient.isHealthy();

        Map<String, Object> response = Map.of(
                "healthy", healthy,
                "service", "Nautilus Trading Engine"
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Nautilus Node 상태 조회
     */
    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNodeStatus(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.info("Nautilus Node 상태 조회: userId={}", userPrincipal.getId());

        return nautilusClient.getNodeStatus()
                .map(status -> {
                    Map<String, Object> response = Map.of(
                            "isRunning", status.isRunning(),
                            "mode", status.mode(),
                            "strategiesCount", status.strategiesCount() != null ? status.strategiesCount() : 0,
                            "activeStrategies", status.activeStrategies() != null ? status.activeStrategies() : 0
                    );
                    return ResponseEntity.ok(ApiResponse.success(response));
                })
                .orElseGet(() -> {
                    Map<String, Object> response = Map.of(
                            "isRunning", false,
                            "mode", "unknown",
                            "strategiesCount", 0,
                            "activeStrategies", 0
                    );
                    return ResponseEntity.ok(ApiResponse.success(response, "Nautilus 서비스에 연결할 수 없습니다"));
                });
    }

    /**
     * 포트폴리오 요약 조회
     */
    @GetMapping("/portfolio")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPortfolio(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.info("포트폴리오 조회: userId={}", userPrincipal.getId());

        return nautilusClient.getPortfolioSummary()
                .map(portfolio -> ResponseEntity.ok(ApiResponse.success(portfolio)))
                .orElseGet(() -> {
                    Map<String, Object> emptyPortfolio = Map.of(
                            "status", "unavailable",
                            "balances", Map.of(),
                            "positions", Map.of(),
                            "openOrders", 0
                    );
                    return ResponseEntity.ok(ApiResponse.success(emptyPortfolio, "포트폴리오 정보를 가져올 수 없습니다"));
                });
    }

    /**
     * Nautilus Node 수동 시작
     */
    @PostMapping("/start")
    public ResponseEntity<ApiResponse<Void>> startNode(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.info("Nautilus Node 수동 시작: userId={}", userPrincipal.getId());

        nautilusClient.startNode();

        return ResponseEntity.ok(ApiResponse.success(null, "Nautilus Node가 시작되었습니다"));
    }
}
