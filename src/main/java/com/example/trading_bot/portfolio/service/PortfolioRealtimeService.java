package com.example.trading_bot.portfolio.service;

import com.example.trading_bot.binance.client.BinanceApiClient;
import com.example.trading_bot.binance.dto.BinanceAccountResponse;
import com.example.trading_bot.binance.exception.BinanceApiException;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.common.util.CryptoUtils;
import com.example.trading_bot.portfolio.dto.PortfolioBalanceResponse;
import com.example.trading_bot.portfolio.dto.PortfolioBalanceResponse.AssetBalance;
import com.example.trading_bot.trade.entity.UserApiKey;
import com.example.trading_bot.trade.repository.UserApiKeyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 포트폴리오 실시간 데이터 서비스
 * - Binance API를 통해 실시간 잔고 조회
 * - 매 요청마다 최신 데이터 반환
 * - 비동기로 DB 동기화 이벤트 발행
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioRealtimeService {
    
    private final UserApiKeyRepository apiKeyRepository;
    private final BinanceApiClient binanceApiClient;
    private final CryptoUtils cryptoUtils;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    
    /**
     * 실시간 포트폴리오 잔고 조회 (항상 최신 데이터)
     * 
     * @param userId 사용자 ID
     * @return 실시간 포트폴리오 잔고
     */
    public PortfolioBalanceResponse getRealtimeBalance(Long userId) {
        log.info("실시간 포트폴리오 조회 시작: userId={}", userId);
        
        // 1. API 키 조회 및 검증
        UserApiKey apiKey = getActiveApiKey(userId);
        String decryptedSecretKey = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
        
        try {
            // 2. Binance API 호출 (항상 최신 데이터)
            BinanceAccountResponse accountInfo = binanceApiClient.getAccountInfo(
                apiKey.getApiKey(), 
                decryptedSecretKey
            );
            
            // 3. 데이터 변환 및 처리
            PortfolioBalanceResponse response = processAccountData(accountInfo, userId);
            
            // 4. 비동기로 DB 동기화 이벤트 발행 (응답 속도에 영향 없음)
            publishSyncEvent(userId, response);
            
            log.info("실시간 포트폴리오 조회 완료: userId={}, 자산수={}, 총가치={} USDT", 
                    userId, response.getBalances().size(), response.getTotalValueUsdt());
            
            return response;
            
        } catch (BinanceApiException e) {
            log.error("Binance API 오류: userId={}, error={}", userId, e.getMessage());
            throw new BusinessException("Binance API 오류: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            log.error("실시간 포트폴리오 조회 실패: userId={}", userId, e);
            throw new BusinessException("포트폴리오 조회 중 오류가 발생했습니다", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 실시간 현재가 정보만 조회 (가볍고 빠른 조회)
     * 
     * @return 심볼별 현재가 맵
     */
    public Map<String, BigDecimal> getCurrentPrices() {
        log.debug("실시간 가격 정보 조회");
        Map<String, BigDecimal> priceMap = new HashMap<>();
        
        try {
            String url = "https://api.binance.com/api/v3/ticker/price";
            String response = restTemplate.getForObject(url, String.class);
            JsonNode prices = objectMapper.readTree(response);
            
            for (JsonNode price : prices) {
                String symbol = price.get("symbol").asText();
                if (symbol.endsWith("USDT")) {
                    priceMap.put(symbol, new BigDecimal(price.get("price").asText()));
                }
            }
            
            // USDT는 1:1
            priceMap.put("USDT", BigDecimal.ONE);
            priceMap.put("USDTUSDT", BigDecimal.ONE);
            
            log.debug("가격 정보 조회 완료: {}개 심볼", priceMap.size());
            
        } catch (Exception e) {
            log.error("가격 정보 조회 실패", e);
            // 실패해도 빈 맵 반환 (서비스 중단 방지)
        }
        
        return priceMap;
    }
    
    /**
     * 특정 심볼의 실시간 가격 조회
     * 
     * @param symbol 심볼 (예: BTCUSDT)
     * @return 현재가
     */
    public BigDecimal getSymbolPrice(String symbol) {
        try {
            String url = String.format("https://api.binance.com/api/v3/ticker/price?symbol=%s", symbol);
            String response = restTemplate.getForObject(url, String.class);
            JsonNode price = objectMapper.readTree(response);
            
            return new BigDecimal(price.get("price").asText());
            
        } catch (Exception e) {
            log.error("심볼 가격 조회 실패: symbol={}", symbol, e);
            return BigDecimal.ZERO;
        }
    }
    
    // ===== Private Helper Methods =====
    
    /**
     * 활성화된 API 키 조회
     */
    private UserApiKey getActiveApiKey(Long userId) {
        return apiKeyRepository.findByUserIdAndExchangeAndIsActiveTrue(userId, "BINANCE")
                .orElseThrow(() -> new BusinessException(
                    "활성화된 Binance API 키가 없습니다. API 키를 먼저 등록해주세요.", 
                    HttpStatus.NOT_FOUND
                ));
    }
    
    /**
     * Binance 계정 데이터 처리 및 변환
     */
    private PortfolioBalanceResponse processAccountData(BinanceAccountResponse accountInfo, Long userId) {
        if (accountInfo == null || accountInfo.getBalances() == null) {
            log.warn("Binance 계정 정보가 비어있습니다: userId={}", userId);
            return createEmptyResponse();
        }
        
        // 현재가 조회
        Map<String, BigDecimal> priceMap = fetchPricesForBalances(accountInfo.getBalances());
        
        // 자산 정보 변환
        List<AssetBalance> balances = convertToAssetBalances(accountInfo.getBalances(), priceMap);
        
        // 총 가치 계산
        BigDecimal totalValueUsdt = calculateTotalValue(balances);
        BigDecimal btcPrice = priceMap.get("BTCUSDT");
        BigDecimal totalValueBtc = calculateBtcValue(totalValueUsdt, btcPrice);
        
        // 비중 계산
        calculateAllocations(balances, totalValueUsdt);
        
        // 가치가 있는 자산만 필터링 및 정렬
        List<AssetBalance> significantBalances = balances.stream()
                .filter(b -> b.getValueUsdt().compareTo(BigDecimal.ZERO) > 0)
                .sorted((a, b) -> b.getValueUsdt().compareTo(a.getValueUsdt()))
                .collect(Collectors.toList());
        
        return PortfolioBalanceResponse.builder()
                .totalValueUsdt(totalValueUsdt)
                .totalValueBtc(totalValueBtc)
                .balances(significantBalances)
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    /**
     * 필요한 심볼의 가격만 효율적으로 조회
     */
    private Map<String, BigDecimal> fetchPricesForBalances(List<BinanceAccountResponse.Balance> balances) {
        Map<String, BigDecimal> priceMap = new HashMap<>();
        
        // 필요한 심볼 목록 생성
        Set<String> requiredSymbols = balances.stream()
                .map(b -> b.getAsset() + "USDT")
                .collect(Collectors.toSet());
        
        // 전체 가격 조회 (한 번의 API 호출로 효율적)
        Map<String, BigDecimal> allPrices = getCurrentPrices();
        
        // 필요한 것만 추출
        for (String symbol : requiredSymbols) {
            String asset = symbol.replace("USDT", "");
            BigDecimal price = allPrices.getOrDefault(symbol, BigDecimal.ZERO);
            priceMap.put(asset, price);
        }
        
        // 특수 처리
        priceMap.put("USDT", BigDecimal.ONE);
        priceMap.putIfAbsent("BTCUSDT", allPrices.getOrDefault("BTCUSDT", BigDecimal.ZERO));
        
        return priceMap;
    }
    
    /**
     * Binance 잔고를 AssetBalance로 변환
     */
    private List<AssetBalance> convertToAssetBalances(
            List<BinanceAccountResponse.Balance> binanceBalances,
            Map<String, BigDecimal> priceMap) {
        
        List<AssetBalance> balances = new ArrayList<>();
        
        for (BinanceAccountResponse.Balance balance : binanceBalances) {
            BigDecimal free = new BigDecimal(balance.getFree());
            BigDecimal locked = new BigDecimal(balance.getLocked());
            BigDecimal total = free.add(locked);
            
            // 0 잔고는 제외
            if (total.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            
            BigDecimal priceUsdt = priceMap.getOrDefault(balance.getAsset(), BigDecimal.ZERO);
            BigDecimal valueUsdt = total.multiply(priceUsdt);
            
            balances.add(AssetBalance.builder()
                    .asset(balance.getAsset())
                    .free(free)
                    .locked(locked)
                    .total(total)
                    .priceUsdt(priceUsdt)
                    .valueUsdt(valueUsdt.setScale(2, RoundingMode.HALF_UP))
                    .allocation(BigDecimal.ZERO) // 나중에 계산
                    .build());
        }
        
        return balances;
    }
    
    /**
     * 총 가치 계산 (USDT 기준)
     */
    private BigDecimal calculateTotalValue(List<AssetBalance> balances) {
        return balances.stream()
                .map(AssetBalance::getValueUsdt)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }
    
    /**
     * BTC 환산 가치 계산
     */
    private BigDecimal calculateBtcValue(BigDecimal usdtValue, BigDecimal btcPrice) {
        if (btcPrice == null || btcPrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return usdtValue.divide(btcPrice, 8, RoundingMode.HALF_UP);
    }
    
    /**
     * 각 자산의 포트폴리오 비중 계산
     */
    private void calculateAllocations(List<AssetBalance> balances, BigDecimal totalValue) {
        if (totalValue.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        
        for (AssetBalance balance : balances) {
            BigDecimal allocation = balance.getValueUsdt()
                    .divide(totalValue, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            balance.setAllocation(allocation);
        }
    }
    
    /**
     * 빈 응답 생성
     */
    private PortfolioBalanceResponse createEmptyResponse() {
        return PortfolioBalanceResponse.builder()
                .totalValueUsdt(BigDecimal.ZERO)
                .totalValueBtc(BigDecimal.ZERO)
                .balances(new ArrayList<>())
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    /**
     * DB 동기화 이벤트 발행 (비동기)
     */
    @Async
    private void publishSyncEvent(Long userId, PortfolioBalanceResponse data) {
        try {
            // 이벤트 발행 (PortfolioSyncService가 처리)
            log.debug("포트폴리오 동기화 이벤트 발행: userId={}", userId);
            eventPublisher.publishEvent(new PortfolioSyncEvent(userId, data));
        } catch (Exception e) {
            // 이벤트 발행 실패해도 실시간 데이터 반환에는 영향 없음
            log.warn("동기화 이벤트 발행 실패 (실시간 데이터는 정상 반환): userId={}", userId, e);
        }
    }
    
    /**
     * 포트폴리오 동기화 이벤트
     */
    public static class PortfolioSyncEvent {
        private final Long userId;
        private final PortfolioBalanceResponse data;
        private final LocalDateTime timestamp;
        
        public PortfolioSyncEvent(Long userId, PortfolioBalanceResponse data) {
            this.userId = userId;
            this.data = data;
            this.timestamp = LocalDateTime.now();
        }
        
        public Long getUserId() { return userId; }
        public PortfolioBalanceResponse getData() { return data; }
        public LocalDateTime getTimestamp() { return timestamp; }
    }
}