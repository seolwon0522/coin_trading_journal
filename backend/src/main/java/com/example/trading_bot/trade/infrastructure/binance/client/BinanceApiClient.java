package com.example.trading_bot.trade.infrastructure.binance.client;

import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.trade.infrastructure.binance.config.BinanceApiConfig;
import com.example.trading_bot.trade.infrastructure.binance.dto.BinanceAccountResponse;
import com.example.trading_bot.trade.infrastructure.binance.dto.BinanceTradeResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class BinanceApiClient {
    
    private final BinanceApiConfig config;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    private static final String HMAC_SHA256 = "HmacSHA256";
    
    /**
     * 사용자의 거래 내역을 조회합니다.
     * 
     * @param apiKey API Key
     * @param secretKey Secret Key
     * @param symbol 거래 심볼 (예: BTCUSDT)
     * @param startTime 시작 시간 (milliseconds)
     * @param endTime 종료 시간 (milliseconds)
     * @param limit 조회 개수 (최대 1000)
     * @return 거래 내역 목록
     */
    public List<BinanceTradeResponse> getMyTrades(
        String apiKey,
        String secretKey,
        String symbol,
        Long startTime,
        Long endTime,
        Integer limit
    ) {
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("symbol", symbol);
            if (startTime != null) params.put("startTime", startTime);
            if (endTime != null) params.put("endTime", endTime);
            if (limit != null) params.put("limit", Math.min(limit, 1000));
            
            String response = executeSignedRequest(
                "/api/v3/myTrades",
                HttpMethod.GET,
                params,
                apiKey,
                secretKey
            );
            
            return objectMapper.readValue(response, new TypeReference<List<BinanceTradeResponse>>() {});
        } catch (Exception e) {
            log.error("Failed to fetch trades from Binance", e);
            throw new BusinessException("Binance API 호출 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 계정 정보를 조회합니다.
     * 
     * @param apiKey API Key
     * @param secretKey Secret Key
     * @return 계정 정보
     */
    public BinanceAccountResponse getAccountInfo(String apiKey, String secretKey) {
        try {
            Map<String, Object> params = new HashMap<>();
            
            String response = executeSignedRequest(
                "/api/v3/account",
                HttpMethod.GET,
                params,
                apiKey,
                secretKey
            );
            
            return objectMapper.readValue(response, BinanceAccountResponse.class);
        } catch (Exception e) {
            log.error("Failed to fetch account info from Binance", e);
            throw new BusinessException("Binance 계정 정보 조회 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 현재 서버 시간을 조회합니다. (연결 테스트용)
     * 
     * @return 서버 시간 (milliseconds)
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
     * API 키 권한을 검증합니다.
     * 
     * @param apiKey API Key
     * @param secretKey Secret Key
     * @return 유효한 경우 true
     */
    public boolean validateApiKeys(String apiKey, String secretKey) {
        try {
            BinanceAccountResponse account = getAccountInfo(apiKey, secretKey);
            return account != null && account.getCanTrade() != null;
        } catch (Exception e) {
            log.warn("API key validation failed", e);
            return false;
        }
    }
    
    /**
     * 서명이 필요한 요청을 실행합니다.
     */
    private String executeSignedRequest(
        String endpoint,
        HttpMethod method,
        Map<String, Object> params,
        String apiKey,
        String secretKey
    ) throws Exception {
        // 타임스탬프 추가
        params.put("timestamp", System.currentTimeMillis());
        params.put("recvWindow", 5000); // 5초
        
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
        ResponseEntity<String> response = restTemplate.exchange(
            uri,
            method,
            entity,
            String.class
        );
        
        if (response.getStatusCode() != HttpStatus.OK) {
            throw new BusinessException(
                "Binance API 오류: " + response.getStatusCode(),
                HttpStatus.valueOf(response.getStatusCode().value())
            );
        }
        
        return response.getBody();
    }
    
    /**
     * HMAC SHA256 서명을 생성합니다.
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
     * 바이트 배열을 16진수 문자열로 변환합니다.
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
    
    /**
     * Map을 쿼리 스트링으로 변환합니다.
     */
    private String buildQueryString(Map<String, Object> params) {
        return params.entrySet().stream()
            .map(entry -> entry.getKey() + "=" + entry.getValue())
            .reduce((a, b) -> a + "&" + b)
            .orElse("");
    }
    
    /**
     * Map을 MultiValueMap으로 변환합니다.
     */
    private org.springframework.util.MultiValueMap<String, String> toMultiValueMap(Map<String, Object> map) {
        org.springframework.util.LinkedMultiValueMap<String, String> multiValueMap = 
            new org.springframework.util.LinkedMultiValueMap<>();
        map.forEach((key, value) -> multiValueMap.add(key, String.valueOf(value)));
        return multiValueMap;
    }
}