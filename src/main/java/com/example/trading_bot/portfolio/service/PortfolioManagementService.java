package com.example.trading_bot.portfolio.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.binance.client.BinanceApiClient;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.common.util.CryptoUtils;
import com.example.trading_bot.portfolio.dto.PortfolioResponse;
import com.example.trading_bot.portfolio.dto.PortfolioSummaryResponse;
import com.example.trading_bot.portfolio.dto.UpdateBuyPriceRequest;
import com.example.trading_bot.portfolio.entity.Portfolio;
import com.example.trading_bot.portfolio.repository.PortfolioRepository;
import com.example.trading_bot.trade.entity.UserApiKey;
import com.example.trading_bot.trade.repository.UserApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioManagementService {
    
    private final PortfolioRepository portfolioRepository;
    private final UserRepository userRepository;
    private final UserApiKeyRepository apiKeyRepository;
    private final BinanceApiClient binanceApiClient;
    private final CryptoUtils cryptoUtils;
    
    /**
     * 사용자의 포트폴리오 조회
     */
    public List<PortfolioResponse> getUserPortfolio(Long userId) {
        List<Portfolio> portfolios = portfolioRepository.findActivePortfoliosByUserId(userId);
        
        return portfolios.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 포트폴리오 요약 정보 조회
     */
    public PortfolioSummaryResponse getPortfolioSummary(Long userId) {
        List<Portfolio> portfolios = portfolioRepository.findActivePortfoliosByUserId(userId);
        
        BigDecimal totalValue = BigDecimal.ZERO;
        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalPnl = BigDecimal.ZERO;
        
        for (Portfolio portfolio : portfolios) {
            if (portfolio.getCurrentValue() != null) {
                totalValue = totalValue.add(portfolio.getCurrentValue());
            }
            if (portfolio.getTotalInvested() != null) {
                totalInvested = totalInvested.add(portfolio.getTotalInvested());
            }
            if (portfolio.getUnrealizedPnl() != null) {
                totalPnl = totalPnl.add(portfolio.getUnrealizedPnl());
            }
        }
        
        BigDecimal totalPnlPercent = BigDecimal.ZERO;
        if (totalInvested.compareTo(BigDecimal.ZERO) > 0) {
            totalPnlPercent = totalPnl.divide(totalInvested, 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
        }
        
        return PortfolioSummaryResponse.builder()
                .totalValue(totalValue)
                .totalInvested(totalInvested)
                .totalPnl(totalPnl)
                .totalPnlPercent(totalPnlPercent)
                .assetCount(portfolios.size())
                .lastUpdate(LocalDateTime.now())
                .build();
    }
    
    /**
     * 포트폴리오 동기화 (Binance 계정 잔고 기반)
     */
    @Transactional
    public Map<String, Object> syncPortfolio(Long userId) {
        log.info("포트폴리오 동기화 시작: userId={}", userId);
        
        UserApiKey apiKey = apiKeyRepository
                .findByUserIdAndExchangeAndIsActiveTrue(userId, "BINANCE")
                .orElseThrow(() -> new BusinessException("활성 Binance API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        String secretKey = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        try {
            // 1. Binance 계정 잔고 조회
            List<Map<String, Object>> balances = binanceApiClient.getAccountBalances(
                    apiKey.getApiKey(), 
                    secretKey
            );
            
            // 2. 현재가 조회
            Map<String, BigDecimal> currentPrices = getCurrentPrices(apiKey.getApiKey(), secretKey);
            
            int updated = 0;
            int created = 0;
            List<String> processedAssets = new ArrayList<>();
            
            // 3. 각 자산별로 포트폴리오 업데이트
            for (Map<String, Object> balance : balances) {
                String asset = (String) balance.get("asset");
                BigDecimal free = new BigDecimal(balance.get("free").toString());
                BigDecimal locked = new BigDecimal(balance.get("locked").toString());
                BigDecimal total = free.add(locked);
                
                // USDT는 제외, 0보다 큰 자산만 처리
                if ("USDT".equals(asset) || total.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                
                String symbol = asset + "USDT";
                processedAssets.add(asset);
                
                // 기존 포트폴리오 조회 또는 생성
                Portfolio portfolio = portfolioRepository
                        .findByUserIdAndSymbol(userId, symbol)
                        .orElse(Portfolio.builder()
                                .user(user)
                                .symbol(symbol)
                                .asset(asset)
                                .isManualEntry(false)
                                .firstBuyDate(LocalDateTime.now())
                                .build());
                
                // 잔고 정보 업데이트
                portfolio.setQuantity(total);
                portfolio.setFree(free);
                portfolio.setLocked(locked);
                portfolio.setLastBalanceUpdate(LocalDateTime.now());
                
                // 현재가 업데이트
                BigDecimal currentPrice = currentPrices.get(symbol);
                if (currentPrice != null) {
                    portfolio.setCurrentPrice(currentPrice);
                    portfolio.setLastPriceUpdate(LocalDateTime.now());
                    
                    // 현재 가치 계산
                    BigDecimal currentValue = total.multiply(currentPrice);
                    portfolio.setCurrentValue(currentValue);
                    
                    // 손익 계산 (평균 매수가가 있는 경우)
                    calculatePnl(portfolio);
                }
                
                if (portfolio.getId() == null) {
                    portfolioRepository.save(portfolio);
                    created++;
                    log.info("새 포트폴리오 생성: {}", symbol);
                } else {
                    portfolioRepository.save(portfolio);
                    updated++;
                    log.info("포트폴리오 업데이트: {}", symbol);
                }
            }
            
            // 4. 잔고가 0이 된 자산 처리
            List<Portfolio> existingPortfolios = portfolioRepository.findByUserIdOrderByCurrentValueDesc(userId);
            for (Portfolio portfolio : existingPortfolios) {
                if (!processedAssets.contains(portfolio.getAsset())) {
                    portfolio.setQuantity(BigDecimal.ZERO);
                    portfolio.setFree(BigDecimal.ZERO);
                    portfolio.setLocked(BigDecimal.ZERO);
                    portfolio.setCurrentValue(BigDecimal.ZERO);
                    portfolio.setLastBalanceUpdate(LocalDateTime.now());
                    portfolioRepository.save(portfolio);
                    log.info("포트폴리오 잔고 0으로 업데이트: {}", portfolio.getSymbol());
                }
            }
            
            log.info("포트폴리오 동기화 완료: 생성 {}, 업데이트 {}", created, updated);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("created", created);
            result.put("updated", updated);
            result.put("totalAssets", processedAssets.size());
            result.put("message", String.format("%d개 자산 동기화 완료", processedAssets.size()));
            
            return result;
            
        } catch (Exception e) {
            log.error("포트폴리오 동기화 실패: {}", e.getMessage());
            throw new BusinessException("포트폴리오 동기화 중 오류가 발생했습니다: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 평균 매수가 수동 업데이트
     */
    @Transactional
    public PortfolioResponse updateBuyPrice(Long userId, UpdateBuyPriceRequest request) {
        Portfolio portfolio = portfolioRepository
                .findByUserIdAndSymbol(userId, request.getSymbol())
                .orElseThrow(() -> new BusinessException("포트폴리오를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 평균 매수가 업데이트
        portfolio.setAvgBuyPrice(request.getAvgBuyPrice());
        
        // 총 투자금액 계산
        BigDecimal totalInvested = request.getAvgBuyPrice().multiply(portfolio.getQuantity());
        portfolio.setTotalInvested(totalInvested);
        
        // 손익 재계산
        calculatePnl(portfolio);
        
        // 매수일 정보 업데이트
        if (request.getFirstBuyDate() != null) {
            portfolio.setFirstBuyDate(request.getFirstBuyDate());
        }
        
        portfolio.setNotes(request.getNotes());
        
        Portfolio saved = portfolioRepository.save(portfolio);
        log.info("평균 매수가 업데이트: userId={}, symbol={}, price={}", 
                userId, request.getSymbol(), request.getAvgBuyPrice());
        
        return convertToResponse(saved);
    }
    
    /**
     * 현재가 업데이트
     */
    @Transactional
    public void updateCurrentPrices(Long userId) {
        log.info("현재가 업데이트 시작: userId={}", userId);
        
        UserApiKey apiKey = apiKeyRepository
                .findByUserIdAndExchangeAndIsActiveTrue(userId, "BINANCE")
                .orElseThrow(() -> new BusinessException("활성 Binance API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        String secretKey = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
        
        // 현재가 조회
        Map<String, BigDecimal> prices = getCurrentPrices(apiKey.getApiKey(), secretKey);
        
        // 포트폴리오 업데이트
        List<Portfolio> portfolios = portfolioRepository.findByUserIdOrderByCurrentValueDesc(userId);
        for (Portfolio portfolio : portfolios) {
            BigDecimal price = prices.get(portfolio.getSymbol());
            if (price != null) {
                portfolio.setCurrentPrice(price);
                portfolio.setLastPriceUpdate(LocalDateTime.now());
                
                // 현재 가치 재계산
                BigDecimal currentValue = portfolio.getQuantity().multiply(price);
                portfolio.setCurrentValue(currentValue);
                
                // 손익 재계산
                calculatePnl(portfolio);
                
                portfolioRepository.save(portfolio);
            }
        }
        
        log.info("현재가 업데이트 완료: {}개 자산", portfolios.size());
    }
    
    /**
     * 손익 계산
     */
    private void calculatePnl(Portfolio portfolio) {
        if (portfolio.getCurrentValue() != null && 
            portfolio.getTotalInvested() != null && 
            portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) > 0) {
            
            BigDecimal pnl = portfolio.getCurrentValue().subtract(portfolio.getTotalInvested());
            portfolio.setUnrealizedPnl(pnl);
            
            BigDecimal pnlPercent = pnl.divide(portfolio.getTotalInvested(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
            portfolio.setUnrealizedPnlPercent(pnlPercent);
        }
    }
    
    /**
     * Binance에서 현재가 조회
     */
    private Map<String, BigDecimal> getCurrentPrices(String apiKey, String secretKey) {
        Map<String, BigDecimal> prices = new HashMap<>();
        
        try {
            // Binance API에서 모든 심볼의 현재가 조회
            List<Map<String, Object>> tickers = binanceApiClient.getAllPrices(apiKey, secretKey);
            
            for (Map<String, Object> ticker : tickers) {
                String symbol = (String) ticker.get("symbol");
                if (symbol.endsWith("USDT")) {
                    String priceStr = (String) ticker.get("price");
                    prices.put(symbol, new BigDecimal(priceStr));
                }
            }
        } catch (Exception e) {
            log.error("현재가 조회 실패: {}", e.getMessage());
        }
        
        return prices;
    }
    
    /**
     * Portfolio 엔티티를 Response DTO로 변환
     */
    private PortfolioResponse convertToResponse(Portfolio portfolio) {
        return PortfolioResponse.builder()
                .id(portfolio.getId())
                .symbol(portfolio.getSymbol())
                .asset(portfolio.getAsset())
                .quantity(portfolio.getQuantity())
                .free(portfolio.getFree())
                .locked(portfolio.getLocked())
                .avgBuyPrice(portfolio.getAvgBuyPrice())
                .totalInvested(portfolio.getTotalInvested())
                .currentPrice(portfolio.getCurrentPrice())
                .currentValue(portfolio.getCurrentValue())
                .unrealizedPnl(portfolio.getUnrealizedPnl())
                .unrealizedPnlPercent(portfolio.getUnrealizedPnlPercent())
                .firstBuyDate(portfolio.getFirstBuyDate())
                .lastBuyDate(portfolio.getLastBuyDate())
                .lastPriceUpdate(portfolio.getLastPriceUpdate())
                .lastBalanceUpdate(portfolio.getLastBalanceUpdate())
                .notes(portfolio.getNotes())
                .isManualEntry(portfolio.getIsManualEntry())
                .build();
    }
}