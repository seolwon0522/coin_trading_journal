package com.example.trading_bot.nautilus;

import com.example.trading_bot.nautilus.dto.NautilusStartStrategyRequest;
import com.example.trading_bot.nautilus.dto.NautilusStrategyStatus;
import com.example.trading_bot.nautilus.dto.NodeStatusResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

/**
 * Nautilus 트레이딩 엔진 클라이언트
 *
 * Circuit Breaker와 Retry 패턴이 적용된 안정적인 클라이언트 구현입니다.
 * 일시적 장애 시 자동 재시도하며, 서비스 불가 시 빠르게 실패합니다.
 */
@Slf4j
@Component
public class NautilusClient implements TradingEngineClient {

    private static final String CIRCUIT_BREAKER_NAME = "nautilusService";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);

    private final WebClient webClient;

    public NautilusClient(WebClient.Builder webClientBuilder,
                          @Value("${nautilus.service.url:http://localhost:8001}") String baseUrl) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .build();
    }

    /**
     * Nautilus Node 시작
     */
    @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "startNodeFallback")
    @Retry(name = CIRCUIT_BREAKER_NAME)
    public void startNode() {
        log.info("Nautilus Node 시작 요청");

        execute(webClient.post()
                .uri("/api/node/start")
                .bodyValue(Map.of("mode", "live"))
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("Node 시작 실패")
                        .map(body -> new NautilusClientException("Nautilus Node 시작 실패: " + body)))
                .toBodilessEntity()
                .timeout(Duration.ofSeconds(30))
                .then());

        log.info("Nautilus Node 시작 완료");
    }

    /**
     * Nautilus Node 상태 확인
     */
    @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "getNodeStatusFallback")
    public Optional<NodeStatusResponse> getNodeStatus() {
        try {
            NodeStatusResponse status = webClient.get()
                    .uri("/api/node/status")
                    .retrieve()
                    .bodyToMono(NodeStatusResponse.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return Optional.ofNullable(status);
        } catch (Exception e) {
            log.warn("Node 상태 조회 실패: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "startStrategyFallback")
    @Retry(name = CIRCUIT_BREAKER_NAME)
    public void startStrategy(NautilusStartStrategyRequest request) {
        log.info("전략 시작 요청: strategyId={}, type={}, symbol={}",
                request.strategyId(), request.type(), request.symbol());

        // Internal endpoint 사용 - Node 시작, 전략 추가, 전략 시작을 한 번에 처리
        Map<String, Object> internalRequest = Map.of(
                "strategy_id", request.strategyId(),
                "type", request.type(),
                "symbol", request.symbol(),
                "timeframe", request.timeframe(),
                "params", request.params() != null ? request.params() : Map.of(),
                "testnet", request.testnet()
        );

        log.debug("Nautilus 요청 payload: {}", internalRequest);

        execute(webClient.post()
                .uri("/internal/strategy/start")
                .bodyValue(internalRequest)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("전략 시작 실패")
                        .map(body -> new NautilusClientException("Nautilus 전략 시작 실패: " + body)))
                .toBodilessEntity()
                .timeout(Duration.ofSeconds(60))
                .then());

        log.info("전략 시작 완료: {}", request.strategyId());
    }

    @Override
    @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "stopStrategyFallback")
    @Retry(name = CIRCUIT_BREAKER_NAME)
    public void stopStrategy(String strategyId) {
        log.info("전략 중지: {}", strategyId);

        // Internal endpoint 사용 - query parameter로 전달
        execute(webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/internal/strategy/stop")
                        .queryParam("strategy_id", strategyId)
                        .build())
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("전략 중지 실패")
                        .map(body -> new NautilusClientException("Nautilus 전략 중지 실패: " + body)))
                .toBodilessEntity()
                .timeout(REQUEST_TIMEOUT)
                .then());

        log.info("전략 중지 완료: {}", strategyId);
    }

    @Override
    @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "getStrategyStatusFallback")
    public Optional<NautilusStrategyStatus> getStrategyStatus(String strategyId) {
        try {
            NautilusStrategyStatus status = webClient.get()
                    .uri("/internal/strategy/status/{strategyId}", strategyId)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> {
                        if (response.statusCode().is4xxClientError()) {
                            return response.bodyToMono(String.class)
                                    .defaultIfEmpty("전략을 찾을 수 없습니다")
                                    .flatMap(body -> Mono.error(new NautilusClientException(body)));
                        }
                        return response.bodyToMono(String.class)
                                .defaultIfEmpty("전략 상태 조회 실패")
                                .flatMap(body -> Mono.error(new NautilusClientException(body)));
                    })
                    .bodyToMono(NautilusStrategyStatus.class)
                    .timeout(REQUEST_TIMEOUT)
                    .block();
            return Optional.ofNullable(status);
        } catch (WebClientResponseException.NotFound notFound) {
            log.debug("Nautilus 전략 {}을(를) 찾을 수 없습니다", strategyId);
            return Optional.empty();
        } catch (WebClientResponseException ex) {
            throw new NautilusClientException("전략 상태 조회 중 오류 발생", ex);
        } catch (WebClientRequestException ex) {
            throw new NautilusClientException("Nautilus 서비스에 연결할 수 없습니다", ex);
        }
    }

    /**
     * 포트폴리오 요약 조회
     */
    @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "getPortfolioSummaryFallback")
    public Optional<Map<String, Object>> getPortfolioSummary() {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> summary = webClient.get()
                    .uri("/api/portfolio/summary")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(REQUEST_TIMEOUT)
                    .block();
            return Optional.ofNullable(summary);
        } catch (Exception e) {
            log.warn("포트폴리오 조회 실패: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * 백테스트 실행
     */
    @CircuitBreaker(name = CIRCUIT_BREAKER_NAME, fallbackMethod = "runBacktestFallback")
    @Retry(name = CIRCUIT_BREAKER_NAME)
    public Map<String, Object> runBacktest(Map<String, Object> request) {
        log.info("백테스트 실행 요청: strategy={}", request.get("strategy_type"));

        @SuppressWarnings("unchecked")
        Map<String, Object> result = webClient.post()
                .uri("/api/backtest/run")
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("백테스트 실행 실패")
                        .map(body -> new NautilusClientException("Nautilus 백테스트 실패: " + body)))
                .bodyToMono(Map.class)
                .timeout(Duration.ofMinutes(5))  // 백테스트는 오래 걸릴 수 있음
                .block();

        log.info("백테스트 완료");
        return result != null ? result : Map.of();
    }

    @Override
    public boolean isHealthy() {
        try {
            webClient.get()
                    .uri("/health")
                    .retrieve()
                    .toBodilessEntity()
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return true;
        } catch (Exception e) {
            log.warn("Nautilus 서비스 헬스체크 실패: {}", e.getMessage());
            return false;
        }
    }

    // Fallback 메서드들
    private void startNodeFallback(Exception ex) {
        log.error("Node 시작 실패 (Circuit Breaker): error={}", ex.getMessage());
        throw new NautilusClientException(
                "트레이딩 엔진 Node를 시작할 수 없습니다. 잠시 후 다시 시도해주세요.", ex);
    }

    private Optional<NodeStatusResponse> getNodeStatusFallback(Exception ex) {
        log.warn("Node 상태 조회 실패 (Circuit Breaker): error={}", ex.getMessage());
        return Optional.empty();
    }

    private void startStrategyFallback(NautilusStartStrategyRequest request, Exception ex) {
        log.error("전략 시작 실패 (Circuit Breaker): strategyId={}, error={}",
                request.strategyId(), ex.getMessage());
        throw new NautilusClientException(
                "트레이딩 엔진을 사용할 수 없습니다. 잠시 후 다시 시도해주세요.", ex);
    }

    private void stopStrategyFallback(String strategyId, Exception ex) {
        log.error("전략 중지 실패 (Circuit Breaker): strategyId={}, error={}",
                strategyId, ex.getMessage());
        throw new NautilusClientException(
                "트레이딩 엔진을 사용할 수 없습니다. 전략이 계속 실행 중일 수 있습니다.", ex);
    }

    private Optional<NautilusStrategyStatus> getStrategyStatusFallback(String strategyId, Exception ex) {
        log.warn("전략 상태 조회 실패 (Circuit Breaker): strategyId={}, error={}",
                strategyId, ex.getMessage());
        return Optional.empty();
    }

    private Optional<Map<String, Object>> getPortfolioSummaryFallback(Exception ex) {
        log.warn("포트폴리오 조회 실패 (Circuit Breaker): error={}", ex.getMessage());
        return Optional.empty();
    }

    private Map<String, Object> runBacktestFallback(Map<String, Object> request, Exception ex) {
        log.error("백테스트 실행 실패 (Circuit Breaker): strategy={}, error={}",
                request.get("strategy_type"), ex.getMessage());
        throw new NautilusClientException(
                "백테스트를 실행할 수 없습니다. 잠시 후 다시 시도해주세요.", ex);
    }

    // 헬퍼 메서드
    private void execute(Mono<Void> mono) {
        try {
            mono.block();
        } catch (WebClientResponseException ex) {
            throw new NautilusClientException("Nautilus API 오류: " + ex.getStatusCode(), ex);
        } catch (WebClientRequestException ex) {
            throw new NautilusClientException("Nautilus 서비스에 연결할 수 없습니다", ex);
        }
    }
}
