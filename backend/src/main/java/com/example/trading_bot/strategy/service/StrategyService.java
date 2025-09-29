package com.example.trading_bot.strategy.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.nautilus.NautilusClient;
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
 * ?꾨왂 愿由??쒕퉬??
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StrategyService {

    private final StrategyRepository strategyRepository;
    private final UserRepository userRepository;
    private final NautilusClient nautilusClient;

    /**
     * ?꾨왂 ?앹꽦
     */
    @Transactional
    public StrategyResponse createStrategy(Long userId, StrategyRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎.", HttpStatus.NOT_FOUND));

        if (strategyRepository.existsByUserIdAndName(userId, request.getName())) {
            throw new BusinessException("?숈씪???대쫫???꾨왂???대? 議댁옱?⑸땲??", HttpStatus.CONFLICT);
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
        log.info("?꾨왂 ?앹꽦 ?꾨즺: userId={}, strategyId={}, type={}", userId, strategy.getId(), strategy.getType());
        return StrategyResponse.from(strategy);
    }

    /**
     * ?꾨왂 ?섏젙
     */
    @Transactional
    public StrategyResponse updateStrategy(Long userId, Long strategyId, StrategyRequest request) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("?꾨왂??李얠쓣 ???놁뒿?덈떎.", HttpStatus.NOT_FOUND));

        if (strategy.isActive()) {
            throw new BusinessException("?ㅽ뻾 以묒씤 ?꾨왂? ?섏젙?????놁뒿?덈떎. 癒쇱? 以묒???二쇱꽭??", HttpStatus.BAD_REQUEST);
        }

        strategy.setName(request.getName());
        strategy.setType(request.getType());
        strategy.setSymbol(request.getSymbol());
        strategy.setParams(request.getParams());
        strategy.setDescription(request.getDescription());
        strategy.setTestnet(request.getTestnet() != null ? request.getTestnet() : true);

        strategy = strategyRepository.save(strategy);
        log.info("?꾨왂 ?섏젙 ?꾨즺: strategyId={}", strategyId);
        return StrategyResponse.from(strategy);
    }

    /**
     * ?꾨왂 ??젣
     */
    @Transactional
    public void deleteStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("?꾨왂??李얠쓣 ???놁뒿?덈떎.", HttpStatus.NOT_FOUND));

        if (strategy.isActive()) {
            throw new BusinessException("?ㅽ뻾 以묒씤 ?꾨왂? ??젣?????놁뒿?덈떎. 癒쇱? 以묒???二쇱꽭??", HttpStatus.BAD_REQUEST);
        }

        strategyRepository.delete(strategy);
        log.info("?꾨왂 ??젣 ?꾨즺: strategyId={}", strategyId);
    }

    /**
     * ?꾨왂 ?④굔 議고쉶
     */
    public StrategyResponse getStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("?꾨왂??李얠쓣 ???놁뒿?덈떎.", HttpStatus.NOT_FOUND));
        return StrategyResponse.from(strategy);
    }

    /**
     * ?섏씠吏 ?꾨왂 議고쉶
     */
    public Page<StrategyResponse> getStrategies(Long userId, Pageable pageable) {
        Page<Strategy> strategies = strategyRepository.findByUserId(userId, pageable);
        return strategies.map(StrategyResponse::from);
    }

    /**
     * ?꾨왂 ?쒖꽦??
     */
    @Transactional
    public void activateStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("?꾨왂??李얠쓣 ???놁뒿?덈떎.", HttpStatus.NOT_FOUND));

        if (strategy.isActive()) {
            throw new BusinessException("?대? ?쒖꽦?붾맂 ?꾨왂?낅땲??", HttpStatus.BAD_REQUEST);
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

            nautilusClient.startStrategy(request);
            strategy.activate();
            strategyRepository.save(strategy);
            log.info("?꾨왂 ?쒖꽦???꾨즺: strategyId={}, nautilusId={}", strategyId, strategy.getNautilusStrategyId());
        } catch (NautilusClientException e) {
            log.error("Nautilus start failed: strategyId={}, error={}", strategyId, e.getMessage());
            throw new BusinessException("Nautilus ?꾨왂 ?쒖옉 ?ㅽ뙣: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ?꾨왂 鍮꾪솢?깊솕
     */
    @Transactional
    public void deactivateStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("?꾨왂??李얠쓣 ???놁뒿?덈떎.", HttpStatus.NOT_FOUND));

        if (!strategy.isActive()) {
            throw new BusinessException("?대? 鍮꾪솢?깊솕???꾨왂?낅땲??", HttpStatus.BAD_REQUEST);
        }

        try {
            nautilusClient.stopStrategy(strategy.getNautilusStrategyId());
            strategy.deactivate();
            strategyRepository.save(strategy);
            log.info("?꾨왂 鍮꾪솢?깊솕 ?꾨즺: strategyId={}, nautilusId={}", strategyId, strategy.getNautilusStrategyId());
        } catch (NautilusClientException e) {
            log.error("Nautilus stop failed: strategyId={}, error={}", strategyId, e.getMessage());
            throw new BusinessException("Nautilus ?꾨왂 以묒? ?ㅽ뙣: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * ?쒖꽦?붾맂 ?꾨왂 紐⑸줉 議고쉶
     */
    public List<StrategyResponse> getActiveStrategies(Long userId) {
        return strategyRepository.findByUserIdAndActive(userId, true)
                .stream()
                .map(StrategyResponse::from)
                .toList();
    }

    /**
     * ?꾨왂 ?곹깭 ?숆린??(Nautilus ?곕룞)
     */
    @Transactional
    public void syncStrategyStatus(Long strategyId) {
        Strategy strategy = strategyRepository.findById(strategyId)
                .orElseThrow(() -> new BusinessException("?꾨왂??李얠쓣 ???놁뒿?덈떎.", HttpStatus.NOT_FOUND));
        syncStrategyStatusInternal(strategy);
    }

    /**
     * Nautilus ID濡??곹깭 ?숆린??
     */
    @Transactional
    public void syncStrategyStatusByNautilusId(String nautilusStrategyId) {
        strategyRepository.findByNautilusStrategyId(nautilusStrategyId)
                .ifPresent(this::syncStrategyStatusInternal);
    }

    /**
     * 嫄곕옒 ?대깽??諛섏쁺
     */
    @Transactional
    public void recordTradeByNautilusId(String nautilusStrategyId) {
        strategyRepository.findByNautilusStrategyId(nautilusStrategyId)
                .ifPresent(strategy -> {
                    strategy.recordTrade();
                    strategyRepository.save(strategy);
                });
    }

    private void syncStrategyStatusInternal(Strategy strategy) {
        if (strategy == null || strategy.getNautilusStrategyId() == null) {
            return;
        }

        Optional<NautilusStrategyStatus> statusOpt = nautilusClient.getStrategyStatus(strategy.getNautilusStrategyId());
        if (statusOpt.isEmpty()) {
            log.debug("No Nautilus status for strategy {}", strategy.getNautilusStrategyId());
            return;
        }

        NautilusStrategyStatus status = statusOpt.get();
        if (status.active() && !strategy.isActive()) {
            strategy.activate();
        } else if (!status.active() && strategy.isActive()) {
            strategy.deactivate();
        }

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
        log.debug("?꾨왂 ?곹깭 ?숆린???꾨즺: strategyId={}, active={}", strategy.getId(), strategy.isActive());
    }

    private Map<String, Object> cloneParameters(Map<String, Object> params) {
        Map<String, Object> copy = new HashMap<>();
        if (params != null) {
            copy.putAll(params);
        }
        return copy;
    }

    private String extractTimeframe(Map<String, Object> params) {
        Object timeframe = params.remove("timeframe");
        if (timeframe == null) {
            timeframe = params.get("time_frame");
        }
        return timeframe != null ? timeframe.toString() : "1m";
    }

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
     * Nautilus Strategy ID ?앹꽦
     */
    private String generateNautilusStrategyId(Long userId) {
        return String.format("STRATEGY_%d_%s", userId, UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }
}
