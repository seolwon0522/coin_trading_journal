package com.example.trading_bot.strategy.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.common.exception.BusinessException;
import org.springframework.http.HttpStatus;
import com.example.trading_bot.strategy.dto.StrategyRequest;
import com.example.trading_bot.strategy.dto.StrategyResponse;
import com.example.trading_bot.strategy.entity.Strategy;
import com.example.trading_bot.strategy.repository.StrategyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * 전략 관리 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StrategyService {

    private final StrategyRepository strategyRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${nautilus.service.url:http://localhost:8001}")
    private String nautilusServiceUrl;

    /**
     * 전략 생성
     */
    @Transactional
    public StrategyResponse createStrategy(Long userId, StrategyRequest request) {
        // 사용자 확인
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));

        // 중복 이름 확인
        if (strategyRepository.existsByUserIdAndName(userId, request.getName())) {
            throw new BusinessException("동일한 이름의 전략이 이미 존재합니다", HttpStatus.CONFLICT);
        }

        // Nautilus Strategy ID 생성
        String nautilusStrategyId = generateNautilusStrategyId(userId);

        // 전략 엔티티 생성
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

        // DB 저장
        strategy = strategyRepository.save(strategy);

        log.info("전략 생성 완료: userId={}, strategyId={}, type={}",
                userId, strategy.getId(), strategy.getType());

        return StrategyResponse.from(strategy);
    }

    /**
     * 전략 수정
     */
    @Transactional
    public StrategyResponse updateStrategy(Long userId, Long strategyId, StrategyRequest request) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다", HttpStatus.NOT_FOUND));

        // 활성화된 전략은 수정 불가
        if (strategy.isActive()) {
            throw new BusinessException("실행 중인 전략은 수정할 수 없습니다. 먼저 중지해주세요.", HttpStatus.BAD_REQUEST);
        }

        // 업데이트
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
     * 전략 삭제
     */
    @Transactional
    public void deleteStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다", HttpStatus.NOT_FOUND));

        // 활성화된 전략은 삭제 불가
        if (strategy.isActive()) {
            throw new BusinessException("실행 중인 전략은 삭제할 수 없습니다. 먼저 중지해주세요.", HttpStatus.BAD_REQUEST);
        }

        strategyRepository.delete(strategy);

        log.info("전략 삭제 완료: strategyId={}", strategyId);
    }

    /**
     * 전략 단건 조회
     */
    public StrategyResponse getStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다", HttpStatus.NOT_FOUND));

        return StrategyResponse.from(strategy);
    }

    /**
     * 사용자의 전략 목록 조회
     */
    public Page<StrategyResponse> getUserStrategies(Long userId, Pageable pageable) {
        Page<Strategy> strategies = strategyRepository.findByUserId(userId, pageable);
        return strategies.map(StrategyResponse::from);
    }

    /**
     * 전략 활성화
     */
    @Transactional
    public void activateStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다", HttpStatus.NOT_FOUND));

        if (strategy.isActive()) {
            throw new BusinessException("이미 활성화된 전략입니다", HttpStatus.BAD_REQUEST);
        }

        // Nautilus 서비스에 전략 시작 요청
        try {
            Map<String, Object> nautilusRequest = Map.of(
                    "strategy_id", strategy.getNautilusStrategyId(),
                    "user_id", userId,
                    "type", strategy.getType().toNautilusType(),
                    "symbol", strategy.getSymbol(),
                    "params", strategy.getParams(),
                    "testnet", strategy.isTestnet()
            );

            String url = nautilusServiceUrl + "/internal/strategy/start";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(nautilusRequest, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // 전략 활성화
                strategy.activate();
                strategyRepository.save(strategy);

                log.info("전략 활성화 완료: strategyId={}, nautilusId={}",
                        strategyId, strategy.getNautilusStrategyId());
            } else {
                throw new BusinessException("전략 활성화에 실패했습니다", HttpStatus.INTERNAL_SERVER_ERROR);
            }

        } catch (Exception e) {
            log.error("전략 활성화 실패: strategyId={}, error={}", strategyId, e.getMessage());
            throw new BusinessException("전략 활성화 중 오류가 발생했습니다: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 전략 비활성화
     */
    @Transactional
    public void deactivateStrategy(Long userId, Long strategyId) {
        Strategy strategy = strategyRepository.findByIdAndUserId(strategyId, userId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다", HttpStatus.NOT_FOUND));

        if (!strategy.isActive()) {
            throw new BusinessException("이미 비활성화된 전략입니다", HttpStatus.BAD_REQUEST);
        }

        // Nautilus 서비스에 전략 중지 요청
        try {
            String url = nautilusServiceUrl + "/internal/strategy/stop?strategy_id=" +
                        strategy.getNautilusStrategyId();

            ResponseEntity<Map> response = restTemplate.postForEntity(url, null, Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // 전략 비활성화
                strategy.deactivate();
                strategyRepository.save(strategy);

                log.info("전략 비활성화 완료: strategyId={}, nautilusId={}",
                        strategyId, strategy.getNautilusStrategyId());
            } else {
                throw new BusinessException("전략 비활성화에 실패했습니다", HttpStatus.INTERNAL_SERVER_ERROR);
            }

        } catch (Exception e) {
            log.error("전략 비활성화 실패: strategyId={}, error={}", strategyId, e.getMessage());
            throw new BusinessException("전략 비활성화 중 오류가 발생했습니다: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 활성화된 전략 목록 조회
     */
    public List<StrategyResponse> getActiveStrategies(Long userId) {
        List<Strategy> activeStrategies = strategyRepository.findByUserIdAndActive(userId, true);
        return activeStrategies.stream()
                .map(StrategyResponse::from)
                .toList();
    }

    /**
     * 전략 상태 동기화 (Nautilus 서비스와)
     */
    @Transactional
    public void syncStrategyStatus(Long strategyId) {
        Strategy strategy = strategyRepository.findById(strategyId)
                .orElseThrow(() -> new BusinessException("전략을 찾을 수 없습니다", HttpStatus.NOT_FOUND));

        if (!strategy.isActive()) {
            return; // 비활성 전략은 동기화하지 않음
        }

        try {
            String url = nautilusServiceUrl + "/internal/strategy/status/" +
                        strategy.getNautilusStrategyId();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> status = response.getBody();

                // PnL 업데이트
                Object realizedPnl = status.get("realized_pnl");
                Object unrealizedPnl = status.get("unrealized_pnl");

                if (realizedPnl != null) {
                    strategy.setRealizedPnl(
                        new java.math.BigDecimal(realizedPnl.toString())
                    );
                }
                if (unrealizedPnl != null) {
                    strategy.setUnrealizedPnl(
                        new java.math.BigDecimal(unrealizedPnl.toString())
                    );
                }

                // 거래 수 업데이트
                Object totalTrades = status.get("total_trades");
                if (totalTrades != null) {
                    strategy.setTotalTrades(Integer.parseInt(totalTrades.toString()));
                }

                strategyRepository.save(strategy);

                log.debug("전략 상태 동기화 완료: strategyId={}", strategyId);
            }

        } catch (Exception e) {
            log.error("전략 상태 동기화 실패: strategyId={}, error={}", strategyId, e.getMessage());
        }
    }

    /**
     * Nautilus Strategy ID 생성
     */
    private String generateNautilusStrategyId(Long userId) {
        return String.format("STRATEGY_%d_%s",
                userId, UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    }
}