package com.example.trading_bot.strategy.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.nautilus.TradingEngineClient;
import com.example.trading_bot.nautilus.NautilusClientException;
import com.example.trading_bot.nautilus.dto.NautilusStartStrategyRequest;
import com.example.trading_bot.nautilus.dto.NautilusStrategyStatus;
import com.example.trading_bot.strategy.dto.StrategyRequest;
import com.example.trading_bot.strategy.dto.StrategyResponse;
import com.example.trading_bot.strategy.entity.Strategy;
import com.example.trading_bot.strategy.repository.StrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

/**
 * Strategy Management Service
 *
 * Handles CRUD operations and lifecycle management for trading strategies.
 * Integrates with TradingEngineClient (Nautilus) for strategy execution.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StrategyService {

    private final StrategyRepository strategyRepository;
    private final UserRepository userRepository;
    private final TradingEngineClient tradingEngineClient;

    /**
     * Create a new trading strategy
     *
     * @param userId User ID
     * @param request Strategy creation request
     * @return Created strategy response
     * @throws BusinessException if user not found or duplicate strategy name
     */
    @Transactional
    public StrategyResponse createStrategy(Long userId, StrategyRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (strategyRepository.existsByUserIdAndName(userId, request.getName())) {
            throw new BusinessException("동일한 이름의 전략이 이미 존재합니다.", HttpStatus.CONFLICT);
        }

        String nautilusStrategyId = generateNautilusStrategyId(userId);

        Strategy strategy = Strategy.builder()
                .user(user)
                .name(request.getName())
                .type(request.getType())
                .symbol(request.getSymbol())
                .params(request.getParams())
                .description(request.getDescription())
                .testnet(request.getTestnet() != null ? request.getTestnet() : true)
                .active(false)
                .nautilusStrategyId(nautilusStrategyId)
                .build();

        strategy = strategyRepository.save(strategy);
        log.info("전략 생성 완료: userId={}, strategyId={}, type={}", userId, strategy.getId(), strategy.getType());
        return StrategyResponse.from(strategy);
    }

    /**
     * Update an existing strategy
     *
     * @param userId User ID
     * @param strategyId Strategy ID
     * @param request Update request
     * @return Updated strategy response
     * @throws BusinessException if strategy not found or currently active
     */
    @Transactional
    public StrategyResponse updateStrategy(Long userId, Long strategyId, StrategyRequest request) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (strategy.isActive()) {
            throw new BusinessException("실행 중인 전략은 수정할 수 없습니다. 먼저 중지해주세요.", HttpStatus.BAD_REQUEST);
        }

        strategy.setName(request.getName());
        strategy.setType(request.getType());
        strategy.setSymbol(request.getSymbol());
        strategy.setParams(request.getParams());
        strategy.setDescription(request.getDescription());
        strategy.setTestnet(request.getTestnet() != null ? request.getTestnet() : true);

        strategy = strategyRepository.save(strategy);
        log.info("전략 수정 완료: strategyId={}", strategyId);
        return StrategyResponse.from(strategy);
    }

    /**
     * Delete a strategy
     *
     * @param userId User ID
     * @param strategyId Strategy ID
     * @throws BusinessException if strategy not found or currently active
     */
    @Transactional
    public void deleteStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (strategy.isActive()) {
            throw new BusinessException("실행 중인 전략은 삭제할 수 없습니다. 먼저 중지해주세요.", HttpStatus.BAD_REQUEST);
        }

        strategyRepository.delete(strategy);
        log.info("전략 삭제 완료: strategyId={}", strategyId);
    }

    /**
     * Get a single strategy
     *
     * @param userId User ID
     * @param strategyId Strategy ID
     * @return Strategy response
     * @throws BusinessException if strategy not found
     */
    public StrategyResponse getStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        return StrategyResponse.from(strategy);
    }

    /**
     * Get paginated list of user's strategies
     *
     * @param userId User ID
     * @param pageable Pagination parameters
     * @return Page of strategies
     */
    public Page<StrategyResponse> getStrategies(Long userId, Pageable pageable) {
        Page<Strategy> strategies = strategyRepository.findByUserId(userId, pageable);
        return strategies.map(StrategyResponse::from);
    }

    /**
     * Activate a strategy (start trading)
     *
     * Uses Circuit Breaker pattern via TradingEngineClient.
     * If Nautilus service is unavailable, Circuit Breaker will fail fast.
     *
     * @param userId User ID
     * @param strategyId Strategy ID
     * @throws BusinessException if strategy not found, already active, or Nautilus service fails
     */
    @Transactional
    public void activateStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (strategy.isActive()) {
            throw new BusinessException("이미 활성화된 전략입니다.", HttpStatus.BAD_REQUEST);
        }

        try {
            Map<String, Object> params = cloneParameters(strategy.getParams());
            String timeframe = extractTimeframe(params);

            NautilusStartStrategyRequest request = new NautilusStartStrategyRequest(
                    strategy.getNautilusStrategyId(),
                    strategy.getType().toNautilusType(),
                    resolveInstrumentId(strategy.getSymbol()),
                    timeframe,
                    params,
                    strategy.isTestnet()
            );

            // Circuit Breaker will handle failures and retries
            tradingEngineClient.startStrategy(request);

            strategy.activate();
            strategyRepository.save(strategy);

            log.info("전략 활성화 완료: strategyId={}, nautilusId={}", strategyId, strategy.getNautilusStrategyId());
        } catch (NautilusClientException e) {
            log.error("Nautilus 전략 시작 실패: strategyId={}, error={}", strategyId, e.getMessage());
            throw new BusinessException("트레이딩 엔진 시작 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Deactivate a strategy (stop trading)
     *
     * @param userId User ID
     * @param strategyId Strategy ID
     * @throws BusinessException if strategy not found, not active, or Nautilus service fails
     */
    @Transactional
    public void deactivateStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));

        if (!strategy.isActive()) {
            throw new BusinessException("이미 비활성화된 전략입니다.", HttpStatus.BAD_REQUEST);
        }

        try {
            // Circuit Breaker will handle failures and retries
            tradingEngineClient.stopStrategy(strategy.getNautilusStrategyId());

            strategy.deactivate();
            strategyRepository.save(strategy);

            log.info("전략 비활성화 완료: strategyId={}, nautilusId={}", strategyId, strategy.getNautilusStrategyId());
        } catch (NautilusClientException e) {
            // Nautilus에서 전략을 찾을 수 없는 경우에도 DB 상태 업데이트
            String errorMessage = e.getMessage();
            Throwable cause = e.getCause();

            // 원본 예외 메시지에서 "Strategy not found" 확인
            boolean isStrategyNotFound = (errorMessage != null && errorMessage.contains("Strategy not found")) ||
                                        (cause != null && cause.getMessage() != null && cause.getMessage().contains("Strategy not found"));

            if (isStrategyNotFound) {
                log.warn("Nautilus에서 전략을 찾을 수 없음. DB 상태만 업데이트: strategyId={}", strategyId);
                strategy.deactivate();
                strategyRepository.save(strategy);
            } else {
                log.error("Nautilus 전략 중지 실패: strategyId={}, error={}", strategyId, e.getMessage());
                throw new BusinessException("트레이딩 엔진 중지 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

    /**
     * Get list of active strategies for a user
     *
     * @param userId User ID
     * @return List of active strategies
     */
    public List<StrategyResponse> getActiveStrategies(Long userId) {
        return strategyRepository.findByUserIdAndActive(userId, true)
                .stream()
                .map(StrategyResponse::from)
                .toList();
    }

    /**
     * Sync strategy status from Nautilus (manual trigger)
     *
     * @param strategyId Strategy ID
     * @throws BusinessException if strategy not found
     */
    @Transactional
    public void syncStrategyStatus(Long strategyId) {
        Strategy strategy = strategyRepository.findById(strategyId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다.", HttpStatus.NOT_FOUND));
        syncStrategyStatusInternal(strategy);
    }

    /**
     * Sync strategy status by Nautilus ID (called by Redis event listener)
     *
     * @param nautilusStrategyId Nautilus strategy identifier
     */
    @Transactional
    public void syncStrategyStatusByNautilusId(String nautilusStrategyId) {
        strategyRepository.findByNautilusStrategyId(nautilusStrategyId)
                .ifPresent(this::syncStrategyStatusInternal);
    }

    /**
     * Record a trade execution (called by Redis event listener)
     *
     * @param nautilusStrategyId Nautilus strategy identifier
     */
    @Transactional
    public void recordTradeByNautilusId(String nautilusStrategyId) {
        strategyRepository.findByNautilusStrategyId(nautilusStrategyId)
                .ifPresent(strategy -> {
                    strategy.recordTrade();
                    strategyRepository.save(strategy);
                    log.debug("거래 기록 완료: nautilusId={}, totalTrades={}",
                            nautilusStrategyId, strategy.getTotalTrades());
                });
    }

    /**
     * Internal method to sync strategy status from Nautilus
     *
     * Fetches current status from trading engine and updates local database.
     * Circuit Breaker pattern ensures resilience if Nautilus is unavailable.
     *
     * @param strategy Strategy entity to sync
     */
    private void syncStrategyStatusInternal(Strategy strategy) {
        if (strategy == null || strategy.getNautilusStrategyId() == null) {
            return;
        }

        // Circuit Breaker will return empty Optional if service is down
        Optional<NautilusStrategyStatus> statusOpt = tradingEngineClient.getStrategyStatus(
                strategy.getNautilusStrategyId());

        if (statusOpt.isEmpty()) {
            log.debug("Nautilus 상태 없음: strategy={}", strategy.getNautilusStrategyId());
            return;
        }

        NautilusStrategyStatus status = statusOpt.get();

        // Sync active status
        if (status.active() && !strategy.isActive()) {
            strategy.activate();
        } else if (!status.active() && strategy.isActive()) {
            strategy.deactivate();
        }

        // Sync performance metrics
        if (status.realizedPnl() != null) {
            strategy.setRealizedPnl(status.realizedPnl());
        }
        if (status.unrealizedPnl() != null) {
            strategy.setUnrealizedPnl(status.unrealizedPnl());
        }
        if (status.totalTrades() != null) {
            strategy.setTotalTrades(status.totalTrades());
        }

        strategyRepository.save(strategy);
        log.debug("전략 상태 동기화 완료: strategyId={}, active={}", strategy.getId(), strategy.isActive());
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    /**
     * Clone strategy parameters map to avoid mutation
     */
    private Map<String, Object> cloneParameters(Map<String, Object> params) {
        Map<String, Object> copy = new HashMap<>();
        if (params != null) {
            copy.putAll(params);
        }
        return copy;
    }

    /**
     * Extract timeframe from parameters, with fallback to 1m
     */
    private String extractTimeframe(Map<String, Object> params) {
        Object timeframe = params.remove("timeframe");
        if (timeframe == null) {
            timeframe = params.get("time_frame");
        }
        return timeframe != null ? timeframe.toString() : "1m";
    }

    /**
     * Resolve instrument ID with venue suffix
     *
     * Examples:
     * - "BTCUSDT" -> "BTCUSDT.BINANCE"
     * - "ETHUSDT.BINANCE" -> "ETHUSDT.BINANCE"
     * - null -> "BTCUSDT.BINANCE" (default)
     */
    private String resolveInstrumentId(String symbol) {
        if (symbol == null) {
            return "BTCUSDT.BINANCE";
        }
        String instrument = symbol.toUpperCase();
        if (!instrument.contains(".")) {
            instrument = instrument + ".BINANCE";
        }
        return instrument;
    }

    /**
     * Generate unique Nautilus strategy ID
     *
     * Format: STRATEGY_{userId}_{randomString}
     * Example: STRATEGY_123_A1B2C3D4
     */
    private String generateNautilusStrategyId(Long userId) {
        return String.format("STRATEGY_%d_%s", userId,
                UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }
}