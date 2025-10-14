package com.example.trading_bot.strategy.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.strategy.dto.StrategyRequest;
import com.example.trading_bot.strategy.dto.StrategyResponse;
import com.example.trading_bot.strategy.service.StrategyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 자동매매 전략 관리 API 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/strategies")
@RequiredArgsConstructor
public class StrategyController {

    private final StrategyService strategyService;

    /**
     * 새로운 전략 생성
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StrategyResponse>> createStrategy(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody StrategyRequest request) {

        log.info("전략 생성 요청: userId={}, name={}, type={}",
                userPrincipal.getId(), request.getName(), request.getType());

        StrategyResponse response = strategyService.createStrategy(userPrincipal.getId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "전략이 성공적으로 생성되었습니다"));
    }

    /**
     * 전략 수정
     */
    @PutMapping("/{strategyId}")
    public ResponseEntity<ApiResponse<StrategyResponse>> updateStrategy(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId,
            @Valid @RequestBody StrategyRequest request) {

        log.info("전략 수정 요청: userId={}, strategyId={}", userPrincipal.getId(), strategyId);

        StrategyResponse response = strategyService.updateStrategy(
                userPrincipal.getId(), strategyId, request);

        return ResponseEntity.ok(
                ApiResponse.success(response, "전략이 성공적으로 수정되었습니다"));
    }

    /**
     * 전략 삭제
     */
    @DeleteMapping("/{strategyId}")
    public ResponseEntity<ApiResponse<Void>> deleteStrategy(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId) {

        log.info("전략 삭제 요청: userId={}, strategyId={}", userPrincipal.getId(), strategyId);

        strategyService.deleteStrategy(userPrincipal.getId(), strategyId);

        return ResponseEntity.ok(
                ApiResponse.success(null, "전략이 성공적으로 삭제되었습니다"));
    }

    /**
     * 전략 단건 조회
     */
    @GetMapping("/{strategyId}")
    public ResponseEntity<ApiResponse<StrategyResponse>> getStrategy(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId) {

        StrategyResponse response = strategyService.getStrategy(userPrincipal.getId(), strategyId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 전략 목록 조회 (페이징)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<StrategyResponse>>> getStrategies(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction) {

        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));

        Page<StrategyResponse> response = strategyService.getStrategies(
                userPrincipal.getId(), pageable);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 활성화된 전략 목록 조회
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<StrategyResponse>>> getActiveStrategies(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        List<StrategyResponse> response = strategyService.getActiveStrategies(userPrincipal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 전략 활성화
     */
    @PostMapping("/{strategyId}/activate")
    public ResponseEntity<ApiResponse<Void>> activateStrategy(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId) {

        log.info("전략 활성화 요청: userId={}, strategyId={}",
                userPrincipal.getId(), strategyId);

        strategyService.activateStrategy(userPrincipal.getId(), strategyId);

        return ResponseEntity.ok(
                ApiResponse.success(null, "전략이 성공적으로 활성화되었습니다"));
    }

    /**
     * 전략 비활성화
     */
    @PostMapping("/{strategyId}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateStrategy(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId) {

        log.info("전략 비활성화 요청: userId={}, strategyId={}",
                userPrincipal.getId(), strategyId);

        strategyService.deactivateStrategy(userPrincipal.getId(), strategyId);

        return ResponseEntity.ok(
                ApiResponse.success(null, "전략이 성공적으로 비활성화되었습니다"));
    }

    /**
     * 전략 상태 동기화
     */
    @PostMapping("/{strategyId}/sync")
    public ResponseEntity<ApiResponse<Void>> syncStrategyStatus(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId) {

        log.info("전략 상태 동기화 요청: userId={}, strategyId={}",
                userPrincipal.getId(), strategyId);

        // 사용자가 소유한 전략인지 확인
        strategyService.getStrategy(userPrincipal.getId(), strategyId);
        strategyService.syncStrategyStatus(strategyId);

        return ResponseEntity.ok(
                ApiResponse.success(null, "전략 상태가 동기화되었습니다"));
    }

    /**
     * 전략 성과 조회
     */
    @GetMapping("/{strategyId}/performance")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStrategyPerformance(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId) {

        log.info("전략 성과 조회: userId={}, strategyId={}", userPrincipal.getId(), strategyId);

        // 전략 조회 (권한 체크 포함)
        StrategyResponse strategy = strategyService.getStrategy(userPrincipal.getId(), strategyId);

        // 성과 데이터 구성
        Map<String, Object> performance = Map.of(
            "strategyId", strategy.getId(),
            "totalTrades", strategy.getTotalTrades() != null ? strategy.getTotalTrades() : 0,
            "winRate", strategy.getWinRate() != null ? strategy.getWinRate().doubleValue() : 0.0,
            "totalReturn", strategy.getTotalReturn() != null ? strategy.getTotalReturn().doubleValue() : 0.0,
            "maxDrawdown", strategy.getMaxDrawdown() != null ? strategy.getMaxDrawdown().doubleValue() : 0.0,
            "sharpeRatio", strategy.getSharpeRatio() != null ? strategy.getSharpeRatio().doubleValue() : 0.0,
            "realizedPnl", strategy.getRealizedPnl() != null ? strategy.getRealizedPnl().doubleValue() : 0.0,
            "unrealizedPnl", strategy.getUnrealizedPnl() != null ? strategy.getUnrealizedPnl().doubleValue() : 0.0,
            "lastUpdated", strategy.getUpdatedAt()
        );

        return ResponseEntity.ok(ApiResponse.success(performance));
    }

    /**
     * 전략 템플릿 목록 조회
     */
    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStrategyTemplates() {
        List<Map<String, Object>> templates = List.of(
            Map.of(
                "type", "EMA_CROSS",
                "name", "EMA Cross",
                "description", "지수이동평균선 교차 전략",
                "defaultParams", Map.of(
                    "fast_period", 12,
                    "slow_period", 26,
                    "timeframe", "1m"
                )
            ),
            Map.of(
                "type", "MARKET_MAKER",
                "name", "Market Maker",
                "description", "변동성 기반 마켓 메이킹 전략",
                "defaultParams", Map.of(
                    "spread_bps", 10,
                    "order_size", 100,
                    "timeframe", "1m"
                )
            ),
            Map.of(
                "type", "ORDERBOOK_IMBALANCE",
                "name", "Orderbook Imbalance",
                "description", "오더북 불균형 기반 고빈도 매매",
                "defaultParams", Map.of(
                    "imbalance_threshold", 0.7,
                    "min_spread_bps", 5,
                    "timeframe", "1m"
                )
            )
        );

        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    /**
     * 전략 템플릿 조회 (개별)
     */
    @GetMapping("/templates/{type}")
    public ResponseEntity<ApiResponse<StrategyRequest>> getStrategyTemplate(
            @PathVariable String type) {

        StrategyRequest template = switch (type.toLowerCase()) {
            case "ema_cross" -> StrategyRequest.createDefaultEmaCross();
            case "market_maker" -> StrategyRequest.createDefaultMarketMaker();
            case "orderbook_imbalance" -> StrategyRequest.createDefaultOrderbookImbalance();
            default -> throw new IllegalArgumentException("지원하지 않는 전략 유형입니다: " + type);
        };

        return ResponseEntity.ok(ApiResponse.success(template));
    }
}

