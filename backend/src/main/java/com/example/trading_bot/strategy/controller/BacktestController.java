package com.example.trading_bot.strategy.controller;

import com.example.trading_bot.auth.security.UserPrincipal;
import com.example.trading_bot.common.dto.ApiResponse;
import com.example.trading_bot.strategy.dto.BacktestRequest;
import com.example.trading_bot.strategy.dto.BacktestResponse;
import com.example.trading_bot.strategy.service.BacktestService;
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

/**
 * 백테스트 관리 API 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/api/backtests")
@RequiredArgsConstructor
public class BacktestController {

    private final BacktestService backtestService;

    /**
     * 백테스트 실행
     */
    @PostMapping
    public ResponseEntity<ApiResponse<BacktestResponse>> runBacktest(
            @AuthenticationPrincipal(errorOnInvalidType = false) UserPrincipal userPrincipal,
            @Valid @RequestBody BacktestRequest request) {

        Long userId = (userPrincipal != null) ? userPrincipal.getId() : null;

        log.info("백테스트 실행 요청: userId={}, strategyId={}, period={} to {}",
                userId, request.getStrategyId(),
                request.getStartDate(), request.getEndDate());

        BacktestResponse response = backtestService.runBacktest(userId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "백테스트가 성공적으로 실행되었습니다"));
    }

    /**
     * 백테스트 결과 단건 조회
     */
    @GetMapping("/{backtestId}")
    public ResponseEntity<ApiResponse<BacktestResponse>> getBacktest(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long backtestId) {

        BacktestResponse response = backtestService.getBacktest(userPrincipal.getId(), backtestId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 전략별 백테스트 이력 조회 (페이징)
     */
    @GetMapping("/strategy/{strategyId}")
    public ResponseEntity<ApiResponse<Page<BacktestResponse>>> getBacktestsByStrategy(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long strategyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<BacktestResponse> response = backtestService.getBacktestsByStrategy(
                userPrincipal.getId(), strategyId, pageable);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 사용자의 모든 백테스트 이력 조회 (페이징)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BacktestResponse>>> getBacktests(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<BacktestResponse> response = backtestService.getBacktests(
                userPrincipal.getId(), pageable);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 백테스트 삭제
     */
    @DeleteMapping("/{backtestId}")
    public ResponseEntity<ApiResponse<Void>> deleteBacktest(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long backtestId) {

        log.info("백테스트 삭제 요청: userId={}, backtestId={}", userPrincipal.getId(), backtestId);

        backtestService.deleteBacktest(userPrincipal.getId(), backtestId);

        return ResponseEntity.ok(
                ApiResponse.success(null, "백테스트 결과가 삭제되었습니다"));
    }

    /**
     * 백테스트 비교 (여러 결과 비교)
     */
    @PostMapping("/compare")
    public ResponseEntity<ApiResponse<Object>> compareBacktests(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody Long[] backtestIds) {

        log.info("백테스트 비교 요청: userId={}, backtestIds={}",
                userPrincipal.getId(), backtestIds);

        Object comparison = backtestService.compareBacktests(userPrincipal.getId(), backtestIds);

        return ResponseEntity.ok(ApiResponse.success(comparison));
    }
}
