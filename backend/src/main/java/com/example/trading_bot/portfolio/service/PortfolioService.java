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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 포트폴리오 관리 서비스
 * Binance API를 통해 사용자의 자산 정보를 조회하고 관리합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioService {
    
    private final UserApiKeyRepository apiKeyRepository;
    private final BinanceApiClient binanceApiClient;
    private final CryptoUtils cryptoUtils;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    private static final BigDecimal MIN_VALUE_THRESHOLD = new BigDecimal("1"); // 1 USDT 미만은 제외
    
    /**
     * 사용자의 포트폴리오 잔고 조회
     * 
     * @param userId 사용자 ID
     * @return 포트폴리오 잔고 정보
     */
    public PortfolioBalanceResponse getUserBalance(Long userId) {
        // 활성화된 Binance API 키 조회
        UserApiKey apiKey = apiKeyRepository.findByUserIdAndExchangeAndIsActiveTrue(userId, "BINANCE")
                .orElseThrow(() -> new BusinessException("활성화된 Binance API 키가 없습니다", HttpStatus.NOT_FOUND));
        
        try {
            // API 키 복호화
            String decryptedSecretKey = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
            
            // Binance 계정 정보 조회
            BinanceAccountResponse accountInfo = binanceApiClient.getAccountInfo(
                apiKey.getApiKey(), 
                decryptedSecretKey
            );
            
            if (accountInfo == null || accountInfo.getBalances() == null) {
                log.warn("Binance 계정 정보가 비어있습니다: userId={}", userId);
                return PortfolioBalanceResponse.builder()
                        .totalValueUsdt(BigDecimal.ZERO)
                        .totalValueBtc(BigDecimal.ZERO)
                        .balances(new ArrayList<>())
                        .timestamp(LocalDateTime.now())
                        .build();
            }
            
            // 현재 가격 정보 조회
            Map<String, BigDecimal> priceMap = fetchCurrentPrices();
            
            // 자산 정보 변환
            List<AssetBalance> balances = convertToAssetBalances(accountInfo.getBalances(), priceMap);
            
            // 총 가치 계산
            BigDecimal totalValueUsdt = calculateTotalValue(balances);
            BigDecimal totalValueBtc = calculateBtcValue(totalValueUsdt, priceMap.get("BTCUSDT"));
            
            // 비중 계산
            calculateAllocations(balances, totalValueUsdt);
            
            // 가치가 있는 자산만 필터링 및 정렬
            List<AssetBalance> significantBalances = balances.stream()
                    .filter(b -> b.getValueUsdt().compareTo(MIN_VALUE_THRESHOLD) > 0)
                    .sorted((a, b) -> b.getValueUsdt().compareTo(a.getValueUsdt()))
                    .collect(Collectors.toList());
            
            log.info("포트폴리오 조회 완료: userId={}, 자산수={}, 총가치={} USDT", 
                    userId, significantBalances.size(), totalValueUsdt);
            
            return PortfolioBalanceResponse.builder()
                    .totalValueUsdt(totalValueUsdt)
                    .totalValueBtc(totalValueBtc)
                    .balances(significantBalances)
                    .timestamp(LocalDateTime.now())
                    .build();
                    
        } catch (BinanceApiException e) {
            log.error("Binance API 오류: userId={}, error={}", userId, e.getMessage(), e);
            throw new BusinessException("Binance API 오류: " + e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (BusinessException e) {
            throw e; // 비즈니스 예외는 그대로 전달
        } catch (Exception e) {
            log.error("포트폴리오 조회 실패: userId={}", userId, e);
            throw new BusinessException("포트폴리오 조회 중 오류가 발생했습니다: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 현재 가격 정보 조회
     * 
     * @return 심볼별 USDT 가격 맵
     */
    private Map<String, BigDecimal> fetchCurrentPrices() {
        Map<String, BigDecimal> priceMap = new HashMap<>();
        
        try {
            String url = "https://api.binance.com/api/v3/ticker/price";
            String response = restTemplate.getForObject(url, String.class);
            JsonNode prices = objectMapper.readTree(response);
            
            for (JsonNode price : prices) {
                String symbol = price.get("symbol").asText();
                if (symbol.endsWith("USDT")) {
                    String asset = symbol.replace("USDT", "");
                    priceMap.put(asset, new BigDecimal(price.get("price").asText()));
                }
            }
            
            // USDT 자체는 1:1
            priceMap.put("USDT", BigDecimal.ONE);
            
            // BTC 가격 별도 저장 (전체 변환용)
            if (prices.isArray()) {
                for (JsonNode price : prices) {
                    if ("BTCUSDT".equals(price.get("symbol").asText())) {
                        priceMap.put("BTCUSDT", new BigDecimal(price.get("price").asText()));
                        break;
                    }
                }
            }
            
        } catch (Exception e) {
            log.error("가격 정보 조회 실패", e);
        }
        
        return priceMap;
    }
    
    /**
     * Binance 잔고 정보를 AssetBalance로 변환
     */
    private List<AssetBalance> convertToAssetBalances(
            List<BinanceAccountResponse.Balance> binanceBalances,
            Map<String, BigDecimal> priceMap) {
        
        List<AssetBalance> balances = new ArrayList<>();
        
        for (BinanceAccountResponse.Balance balance : binanceBalances) {
            BigDecimal free = balance.getFree() != null ? new BigDecimal(balance.getFree()) : BigDecimal.ZERO;
            BigDecimal locked = balance.getLocked() != null ? new BigDecimal(balance.getLocked()) : BigDecimal.ZERO;
            BigDecimal total = free.add(locked);
            
            // 잔고가 0인 경우 제외
            if (total.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            
            // USDT 가격 조회
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
     * 총 자산 가치 계산 (USDT 기준)
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
}