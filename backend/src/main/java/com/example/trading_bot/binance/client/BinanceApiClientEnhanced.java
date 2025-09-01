package com.example.trading_bot.binance.client;

import com.example.trading_bot.binance.config.BinanceApiConfig;
import com.example.trading_bot.binance.dto.ApiKeyValidationResult;
import com.example.trading_bot.binance.dto.BinanceAccountResponse;
import com.example.trading_bot.binance.dto.BinanceTradeResponse;
import com.example.trading_bot.binance.exception.BinanceApiException;
import com.example.trading_bot.binance.exception.BinanceApiException.BinanceErrorType;
import com.example.trading_bot.common.exception.BusinessException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 개선된 Binance API 클라이언트
 * - 상세한 에러 처리
 * - Rate Limit 관리
 * - Circuit Breaker 패턴
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BinanceApiClientEnhanced {
    
    private final BinanceApiConfig config;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    private static final String HMAC_SHA256 = "HmacSHA256";
    
    // Rate Limit 관리
    private final AtomicInteger requestWeight = new AtomicInteger(0);
    private final AtomicLong lastResetTime = new AtomicLong(System.currentTimeMillis());
    private static final int MAX_WEIGHT_PER_MINUTE = 1200;
    private static final int DEFAULT_WEIGHT = 1;
    
    // Circuit Breaker 상태
    private final Map<String, CircuitBreakerState> circuitBreakers = new ConcurrentHashMap<>();
    
    /**
     * Circuit Breaker 상태 관리
     */
    private static class CircuitBreakerState {
        private final AtomicInteger failureCount = new AtomicInteger(0);
        private final AtomicLong lastFailureTime = new AtomicLong(0);
        private final AtomicLong openTime = new AtomicLong(0);
        
        private static final int FAILURE_THRESHOLD = 5;
        private static final long TIMEOUT_DURATION = 60000; // 1분
        
        public boolean isOpen() {
            if (openTime.get() > 0) {
                // 타임아웃 후 Half-Open 상태로 전환
                if (System.currentTimeMillis() - openTime.get() > TIMEOUT_DURATION) {
                    reset();
                    return false;
                }
                return true;
            }
            return false;
        }
        
        public void recordSuccess() {
            reset();
        }
        
        public void recordFailure() {
            lastFailureTime.set(System.currentTimeMillis());
            if (failureCount.incrementAndGet() >= FAILURE_THRESHOLD) {
                openTime.set(System.currentTimeMillis());
                log.warn("Circuit breaker opened due to {} consecutive failures", FAILURE_THRESHOLD);
            }
        }
        
        private void reset() {
            failureCount.set(0);
            lastFailureTime.set(0);
            openTime.set(0);
        }
    }
    
    /**
     * 개선된 API 키 검증
     * 
     * @param apiKey API Key
     * @param secretKey Secret Key
     * @return 상세한 검증 결과
     */
    public ApiKeyValidationResult validateApiKeysEnhanced(String apiKey, String secretKey) {
        try {
            // Circuit Breaker 체크
            CircuitBreakerState breaker = circuitBreakers.computeIfAbsent(apiKey, k -> new CircuitBreakerState());
            if (breaker.isOpen()) {
                return ApiKeyValidationResult.failure("CB_OPEN", "서비스 일시 중단 (너무 많은 실패)");
            }
            
            // Rate Limit 체크
            if (!checkRateLimit(10)) { // Account endpoint weight = 10
                return ApiKeyValidationResult.failure("RATE_LIMIT", "API 호출 한도 초과");
            }
            
            // 서버 시간 동기화 체크
            Long serverTime = getServerTime();
            long timeDiff = Math.abs(System.currentTimeMillis() - serverTime);
            if (timeDiff > 5000) { // 5초 이상 차이
                return ApiKeyValidationResult.failure("TIME_SYNC", "시간 동기화 필요: " + timeDiff + "ms 차이");
            }
            
            // 계정 정보 조회
            BinanceAccountResponse account = getAccountInfo(apiKey, secretKey);
            
            // 권한 체크
            if (account.getPermissions() == null || !account.getPermissions().contains("SPOT")) {
                return ApiKeyValidationResult.failure("NO_PERMISSION", "SPOT 거래 권한 없음");
            }
            
            breaker.recordSuccess();
            return ApiKeyValidationResult.success(account);
            
        } catch (BinanceApiException e) {
            circuitBreakers.get(apiKey).recordFailure();
            return handleBinanceException(e);
        } catch (Exception e) {
            log.error("API 키 검증 중 예상치 못한 오류", e);
            return ApiKeyValidationResult.failure("UNKNOWN", e.getMessage());
        }
    }
    
    /**
     * 계정 정보 조회
     */
    private BinanceAccountResponse getAccountInfo(String apiKey, String secretKey) throws BinanceApiException {
        try {
            Map<String, Object> params = new HashMap<>();
            
            String response = executeSignedRequestEnhanced(
                "/api/v3/account",
                HttpMethod.GET,
                params,
                apiKey,
                secretKey,
                10 // weight
            );
            
            return objectMapper.readValue(response, BinanceAccountResponse.class);
        } catch (HttpClientErrorException e) {
            throw parseBinanceError(e);
        } catch (Exception e) {
            throw new BinanceApiException(
                "계정 정보 조회 실패",
                "UNKNOWN",
                HttpStatus.INTERNAL_SERVER_ERROR,
                BinanceErrorType.UNKNOWN
            );
        }
    }
    
    /**
     * 개선된 거래 내역 조회 (에러 처리 강화)
     */
    public List<BinanceTradeResponse> getMyTradesEnhanced(
        String apiKey,
        String secretKey,
        String symbol,
        Long startTime,
        Long endTime,
        Integer limit
    ) throws BinanceApiException {
        try {
            // Rate Limit 체크
            if (!checkRateLimit(10)) {
                throw new BinanceApiException(
                    "Rate limit exceeded",
                    "RATE_LIMIT",
                    HttpStatus.TOO_MANY_REQUESTS,
                    BinanceErrorType.RATE_LIMIT_EXCEEDED
                );
            }
            
            Map<String, Object> params = new HashMap<>();
            params.put("symbol", symbol);
            if (startTime != null) params.put("startTime", startTime);
            if (endTime != null) params.put("endTime", endTime);
            if (limit != null) params.put("limit", Math.min(limit, 1000));
            
            String response = executeSignedRequestEnhanced(
                "/api/v3/myTrades",
                HttpMethod.GET,
                params,
                apiKey,
                secretKey,
                10
            );
            
            return objectMapper.readValue(response, new TypeReference<List<BinanceTradeResponse>>() {});
            
        } catch (HttpClientErrorException e) {
            throw parseBinanceError(e);
        } catch (Exception e) {
            log.error("거래 내역 조회 실패: symbol={}", symbol, e);
            throw new BinanceApiException(
                "거래 내역 조회 실패",
                "TRADE_FETCH_ERROR",
                HttpStatus.INTERNAL_SERVER_ERROR,
                BinanceErrorType.UNKNOWN
            );
        }
    }
    
    /**
     * 개선된 서명 요청 실행
     */
    private String executeSignedRequestEnhanced(
        String endpoint,
        HttpMethod method,
        Map<String, Object> params,
        String apiKey,
        String secretKey,
        int weight
    ) throws Exception {
        // Rate Limit 업데이트
        updateRateLimit(weight);
        
        // 타임스탬프 추가
        params.put("timestamp", System.currentTimeMillis());
        params.put("recvWindow", 5000);
        
        // 쿼리 스트링 생성
        String queryString = buildQueryString(params);
        
        // 서명 생성
        String signature = generateSignature(queryString, secretKey);
        params.put("signature", signature);
        
        // URL 생성
        URI uri = UriComponentsBuilder
            .fromHttpUrl(config.getActiveBaseUrl() + endpoint)
            .queryParams(toMultiValueMap(params))
            .build()
            .toUri();
        
        // 헤더 설정
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-MBX-APIKEY", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // 요청 실행
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                uri,
                method,
                entity,
                String.class
            );
            
            if (response.getStatusCode() != HttpStatus.OK) {
                HttpStatus httpStatus = HttpStatus.valueOf(response.getStatusCode().value());
                throw new BinanceApiException(
                    "Unexpected status code: " + httpStatus,
                    String.valueOf(httpStatus.value()),
                    httpStatus,
                    BinanceErrorType.UNKNOWN
                );
            }
            
            return response.getBody();
            
        } catch (HttpClientErrorException e) {
            // Binance 에러 응답 파싱
            throw parseBinanceError(e);
        }
    }
    
    /**
     * Binance 에러 응답 파싱
     */
    private BinanceApiException parseBinanceError(HttpClientErrorException e) {
        try {
            String responseBody = e.getResponseBodyAsString();
            JsonNode errorNode = objectMapper.readTree(responseBody);
            
            String code = errorNode.has("code") ? errorNode.get("code").asText() : "UNKNOWN";
            String msg = errorNode.has("msg") ? errorNode.get("msg").asText() : e.getMessage();
            
            BinanceErrorType errorType = BinanceApiException.determineErrorType(code, msg);
            
            log.error("Binance API Error - Code: {}, Message: {}, Type: {}", code, msg, errorType);
            
            return new BinanceApiException(msg, code, HttpStatus.valueOf(e.getStatusCode().value()), errorType);
            
        } catch (Exception parseError) {
            log.error("Failed to parse Binance error response", parseError);
            return new BinanceApiException(
                e.getMessage(),
                "PARSE_ERROR",
                HttpStatus.valueOf(e.getStatusCode().value()),
                BinanceErrorType.UNKNOWN
            );
        }
    }
    
    /**
     * Binance 예외를 검증 결과로 변환
     */
    private ApiKeyValidationResult handleBinanceException(BinanceApiException e) {
        String userMessage;
        
        switch (e.getErrorType()) {
            case INVALID_API_KEY:
                userMessage = "API 키가 올바르지 않습니다. 다시 확인해주세요.";
                break;
            case INVALID_SIGNATURE:
                userMessage = "Secret 키가 올바르지 않습니다. 다시 확인해주세요.";
                break;
            case IP_NOT_WHITELISTED:
                userMessage = "현재 IP가 Binance API 키의 화이트리스트에 없습니다.";
                break;
            case RATE_LIMIT_EXCEEDED:
                userMessage = "API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
                break;
            case PERMISSION_DENIED:
                userMessage = "API 키에 필요한 권한이 없습니다. 'Enable Reading' 권한을 확인해주세요.";
                break;
            case TIMESTAMP_ERROR:
                userMessage = "시스템 시간이 Binance 서버와 맞지 않습니다.";
                break;
            case NETWORK_ERROR:
                userMessage = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
                break;
            case MAINTENANCE:
                userMessage = "Binance 서버 점검 중입니다. 나중에 다시 시도해주세요.";
                break;
            default:
                userMessage = "알 수 없는 오류가 발생했습니다: " + e.getMessage();
        }
        
        return ApiKeyValidationResult.failure(e.getErrorCode(), userMessage);
    }
    
    /**
     * Rate Limit 체크
     */
    private boolean checkRateLimit(int weight) {
        long currentTime = System.currentTimeMillis();
        long timeSinceReset = currentTime - lastResetTime.get();
        
        // 1분마다 리셋
        if (timeSinceReset > 60000) {
            requestWeight.set(0);
            lastResetTime.set(currentTime);
        }
        
        return requestWeight.get() + weight <= MAX_WEIGHT_PER_MINUTE;
    }
    
    /**
     * Rate Limit 업데이트
     */
    private void updateRateLimit(int weight) {
        requestWeight.addAndGet(weight);
    }
    
    /**
     * 서버 시간 조회
     */
    public Long getServerTime() {
        try {
            String url = config.getActiveBaseUrl() + "/api/v3/time";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return ((Number) response.getBody().get("serverTime")).longValue();
            }
            
            throw new BusinessException("서버 시간 조회 실패", HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            log.error("Failed to get server time from Binance", e);
            throw new BusinessException("Binance 연결 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * HMAC SHA256 서명 생성
     */
    private String generateSignature(String data, String secretKey) throws Exception {
        Mac hmacSha256 = Mac.getInstance(HMAC_SHA256);
        SecretKeySpec secretKeySpec = new SecretKeySpec(
            secretKey.getBytes(StandardCharsets.UTF_8),
            HMAC_SHA256
        );
        hmacSha256.init(secretKeySpec);
        
        byte[] hash = hmacSha256.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hash);
    }
    
    /**
     * 바이트 배열을 16진수 문자열로 변환
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
    
    /**
     * Map을 쿼리 스트링으로 변환
     */
    private String buildQueryString(Map<String, Object> params) {
        return params.entrySet().stream()
            .map(entry -> entry.getKey() + "=" + entry.getValue())
            .reduce((a, b) -> a + "&" + b)
            .orElse("");
    }
    
    /**
     * Map을 MultiValueMap으로 변환
     */
    private org.springframework.util.MultiValueMap<String, String> toMultiValueMap(Map<String, Object> map) {
        org.springframework.util.LinkedMultiValueMap<String, String> multiValueMap = 
            new org.springframework.util.LinkedMultiValueMap<>();
        map.forEach((key, value) -> multiValueMap.add(key, String.valueOf(value)));
        return multiValueMap;
    }
}