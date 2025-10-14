package com.example.trading_bot.strategy.service;

import com.example.trading_bot.nautilus.NautilusClient;
import com.example.trading_bot.strategy.dto.BacktestRequest;
import com.example.trading_bot.strategy.dto.BacktestResponse;
import com.example.trading_bot.strategy.entity.Backtest;
import com.example.trading_bot.strategy.entity.Strategy;
import com.example.trading_bot.strategy.repository.BacktestRepository;
import com.example.trading_bot.strategy.repository.StrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 백테스트 비즈니스 로직 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BacktestService {

    private final BacktestRepository backtestRepository;
    private final StrategyRepository strategyRepository;
    private final NautilusClient nautilusClient;

    /**
     * 백테스트 실행
     */
    @Transactional
    public BacktestResponse runBacktest(Long userId, BacktestRequest request) {
        // 전략 조회 (userId가 null이면 ID로만 조회)
        Strategy strategy;
        if (userId != null) {
            strategy = strategyRepository.findByIdAndUserId(request.getStrategyId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("전략을 찾을 수 없습니다"));
        } else {
            strategy = strategyRepository.findById(request.getStrategyId())
                    .orElseThrow(() -> new IllegalArgumentException("전략을 찾을 수 없습니다"));
        }

        // 날짜 검증
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("종료일은 시작일보다 이후여야 합니다");
        }

        log.info("백테스트 실행 시작: strategyId={}, period={} to {}",
                strategy.getId(), request.getStartDate(), request.getEndDate());

        // Nautilus 서비스에 백테스트 요청
        Map<String, Object> nautilusRequest = buildNautilusBacktestRequest(strategy, request);
        Map<String, Object> nautilusResult = nautilusClient.runBacktest(nautilusRequest);

        // 백테스트 결과 저장
        Backtest backtest = Backtest.builder()
                .strategy(strategy)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .timeframe(request.getTimeframe())
                .initialCapital(request.getInitialCapital())
                .finalCapital(extractBigDecimal(nautilusResult, "final_balance"))
                .totalTrades(extractInteger(nautilusResult, "total_trades"))
                .winningTrades(extractInteger(nautilusResult, "winning_trades"))
                .losingTrades(extractInteger(nautilusResult, "losing_trades"))
                .maxDrawdown(extractBigDecimal(nautilusResult, "max_drawdown"))
                .sharpeRatio(extractBigDecimal(nautilusResult, "sharpe_ratio"))
                .totalReturn(extractBigDecimal(nautilusResult, "total_return"))
                .totalPnl(calculateTotalPnl(nautilusResult))
                .resultData(nautilusResult)
                .description(request.getDescription())
                .build();

        log.info("백테스트 저장 전 데이터: totalTrades={}, winningTrades={}, losingTrades={}, nautilusWinRate={}",
                backtest.getTotalTrades(), backtest.getWinningTrades(), backtest.getLosingTrades(),
                nautilusResult.get("win_rate"));

        backtest = backtestRepository.save(backtest);

        log.info("백테스트 완료: backtestId={}, totalTrades={}, winningTrades={}, losingTrades={}, calculatedWinRate={}%",
                backtest.getId(), backtest.getTotalTrades(), backtest.getWinningTrades(),
                backtest.getLosingTrades(), backtest.getWinRate());

        return convertToResponse(backtest);
    }

    /**
     * 백테스트 결과 조회
     */
    @Transactional(readOnly = true)
    public BacktestResponse getBacktest(Long userId, Long backtestId) {
        Backtest backtest = backtestRepository.findByIdAndUserId(backtestId, userId);
        if (backtest == null) {
            throw new IllegalArgumentException("백테스트 결과를 찾을 수 없습니다");
        }
        return convertToResponse(backtest);
    }

    /**
     * 전략별 백테스트 이력 조회
     */
    @Transactional(readOnly = true)
    public Page<BacktestResponse> getBacktestsByStrategy(Long userId, Long strategyId, Pageable pageable) {
        // 전략 권한 체크
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new IllegalArgumentException("전략을 찾을 수 없습니다"));

        return backtestRepository.findByStrategyId(strategy.getId(), pageable)
                .map(this::convertToResponse);
    }

    /**
     * 사용자의 모든 백테스트 조회
     */
    @Transactional(readOnly = true)
    public Page<BacktestResponse> getBacktests(Long userId, Pageable pageable) {
        return backtestRepository.findByUserId(userId, pageable)
                .map(this::convertToResponse);
    }

    /**
     * 백테스트 삭제
     */
    @Transactional
    public void deleteBacktest(Long userId, Long backtestId) {
        Backtest backtest = backtestRepository.findByIdAndUserId(backtestId, userId);
        if (backtest == null) {
            throw new IllegalArgumentException("백테스트 결과를 찾을 수 없습니다");
        }
        backtestRepository.delete(backtest);
        log.info("백테스트 삭제: backtestId={}", backtestId);
    }

    /**
     * 백테스트 비교
     */
    @Transactional(readOnly = true)
    public Map<String, Object> compareBacktests(Long userId, Long[] backtestIds) {
        List<Backtest> backtests = Arrays.stream(backtestIds)
                .map(id -> backtestRepository.findByIdAndUserId(id, userId))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (backtests.isEmpty()) {
            throw new IllegalArgumentException("비교할 백테스트를 찾을 수 없습니다");
        }

        // 비교 데이터 구성
        Map<String, Object> comparison = new HashMap<>();
        comparison.put("backtests", backtests.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList()));

        // 통계 요약
        comparison.put("summary", Map.of(
                "bestReturn", backtests.stream()
                        .map(Backtest::getTotalReturn)
                        .filter(Objects::nonNull)
                        .max(Comparator.naturalOrder())
                        .orElse(BigDecimal.ZERO),
                "bestSharpe", backtests.stream()
                        .map(Backtest::getSharpeRatio)
                        .filter(Objects::nonNull)
                        .max(Comparator.naturalOrder())
                        .orElse(BigDecimal.ZERO),
                "avgWinRate", backtests.stream()
                        .map(Backtest::getWinRate)
                        .filter(Objects::nonNull)
                        .mapToDouble(BigDecimal::doubleValue)
                        .average()
                        .orElse(0.0)
        ));

        return comparison;
    }

    /**
     * Nautilus 백테스트 요청 생성
     */
    private Map<String, Object> buildNautilusBacktestRequest(Strategy strategy, BacktestRequest request) {
        Map<String, Object> nautilusRequest = new HashMap<>();
        nautilusRequest.put("strategy_type", strategy.getType().name().toLowerCase());
        nautilusRequest.put("instrument_id", strategy.getSymbol() + ".BINANCE");
        nautilusRequest.put("timeframe", request.getTimeframe());
        nautilusRequest.put("start_date", request.getStartDate().format(DateTimeFormatter.ISO_DATE));
        nautilusRequest.put("end_date", request.getEndDate().format(DateTimeFormatter.ISO_DATE));
        nautilusRequest.put("initial_balance", request.getInitialCapital().doubleValue());
        nautilusRequest.put("parameters", strategy.getParams());

        if (request.getAdditionalParams() != null) {
            nautilusRequest.putAll(request.getAdditionalParams());
        }

        return nautilusRequest;
    }

    /**
     * Entity -> Response DTO 변환
     */
    private BacktestResponse convertToResponse(Backtest backtest) {
        Strategy strategy = backtest.getStrategy();

        return BacktestResponse.builder()
                .id(backtest.getId())
                .strategyId(strategy.getId())
                .strategyName(strategy.getName())
                .strategyType(strategy.getType().name())
                .symbol(strategy.getSymbol())
                .startDate(backtest.getStartDate())
                .endDate(backtest.getEndDate())
                .timeframe(backtest.getTimeframe())
                .initialCapital(backtest.getInitialCapital())
                .finalCapital(backtest.getFinalCapital())
                .totalTrades(backtest.getTotalTrades())
                .winningTrades(backtest.getWinningTrades())
                .losingTrades(backtest.getLosingTrades())
                .winRate(backtest.getWinRate())
                .totalReturn(backtest.getTotalReturn())
                .totalPnl(backtest.getTotalPnl())
                .maxDrawdown(backtest.getMaxDrawdown())
                .sharpeRatio(backtest.getSharpeRatio())
                .resultData(backtest.getResultData())
                .description(backtest.getDescription())
                .createdAt(backtest.getCreatedAt())
                .build();
    }

    /**
     * Helper: Map에서 BigDecimal 추출
     */
    private BigDecimal extractBigDecimal(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        return null;
    }

    /**
     * Helper: Map에서 Integer 추출
     */
    private Integer extractInteger(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        return null;
    }

    /**
     * Helper: Total PnL 계산 (final_balance - initial_balance)
     */
    private BigDecimal calculateTotalPnl(Map<String, Object> map) {
        BigDecimal finalBalance = extractBigDecimal(map, "final_balance");
        BigDecimal initialBalance = extractBigDecimal(map, "initial_balance");
        
        if (finalBalance != null && initialBalance != null) {
            return finalBalance.subtract(initialBalance);
        }
        return null;
    }
}
