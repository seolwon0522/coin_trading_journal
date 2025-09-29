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
     * 전략 템플릿 조회
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

