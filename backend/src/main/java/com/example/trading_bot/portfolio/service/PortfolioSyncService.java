package com.example.trading_bot.portfolio.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.portfolio.dto.PortfolioBalanceResponse;
import com.example.trading_bot.portfolio.dto.PortfolioBalanceResponse.AssetBalance;
import com.example.trading_bot.portfolio.dto.UpdateBuyPriceRequest;
import com.example.trading_bot.portfolio.entity.Portfolio;
import com.example.trading_bot.portfolio.repository.PortfolioRepository;
import com.example.trading_bot.portfolio.service.PortfolioRealtimeService.PortfolioSyncEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 포트폴리오 DB 동기화 서비스
 * - DB 저장/업데이트만 담당
 * - 실시간 조회와 완전히 분리
 * - 비동기 처리로 성능 영향 최소화
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortfolioSyncService {
    
    private final PortfolioRepository portfolioRepository;
    private final UserRepository userRepository;
    private final PortfolioRealtimeService realtimeService;
    
    /**
     * 실시간 데이터 이벤트를 받아 DB에 동기화
     * 비동기로 실행되어 실시간 조회 성능에 영향 없음
     */
    @Async
    @EventListener
    @Transactional
    public void handlePortfolioSyncEvent(PortfolioSyncEvent event) {
        Long userId = event.getUserId();
        PortfolioBalanceResponse data = event.getData();
        
        log.debug("포트폴리오 DB 동기화 시작: userId={}", userId);
        
        try {
            syncPortfolioData(userId, data);
            log.debug("포트폴리오 DB 동기화 완료: userId={}", userId);
        } catch (Exception e) {
            log.error("포트폴리오 DB 동기화 실패: userId={}", userId, e);
            // DB 동기화 실패는 실시간 서비스에 영향 없음
        }
    }
    
    /**
     * 수동 동기화 (명시적 호출용)
     * 사용자가 강제 동기화를 원할 때 사용
     */
    @Transactional
    public Map<String, Object> syncNow(Long userId) {
        log.info("수동 포트폴리오 동기화 시작: userId={}", userId);
        
        try {
            // 실시간 데이터 가져오기
            PortfolioBalanceResponse realtimeData = realtimeService.getRealtimeBalance(userId);
            
            // DB 동기화
            int updated = syncPortfolioData(userId, realtimeData);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("updatedAssets", updated);
            result.put("totalAssets", realtimeData.getBalances().size());
            result.put("totalValue", realtimeData.getTotalValueUsdt());
            result.put("message", String.format("%d개 자산 동기화 완료", updated));
            result.put("timestamp", LocalDateTime.now());
            
            log.info("수동 포트폴리오 동기화 완료: userId={}, 자산수={}", userId, updated);
            
            return result;
            
        } catch (Exception e) {
            log.error("수동 동기화 실패: userId={}", userId, e);
            throw new RuntimeException("동기화 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * 평균 매수가 수동 업데이트
     * 사용자가 직접 매수가를 입력할 때 사용
     */
    @Transactional
    public Portfolio updateBuyPrice(Long userId, UpdateBuyPriceRequest request) {
        log.info("평균 매수가 업데이트: userId={}, symbol={}, price={}", 
                userId, request.getSymbol(), request.getAvgBuyPrice());
        
        Portfolio portfolio = portfolioRepository
                .findByUserIdAndSymbol(userId, request.getSymbol())
                .orElseThrow(() -> new RuntimeException("포트폴리오를 찾을 수 없습니다: " + request.getSymbol()));
        
        // 평균 매수가 업데이트
        portfolio.setAvgBuyPrice(request.getAvgBuyPrice());
        
        // 총 투자금액 재계산
        if (portfolio.getQuantity() != null) {
            BigDecimal totalInvested = request.getAvgBuyPrice().multiply(portfolio.getQuantity());
            portfolio.setTotalInvested(totalInvested);
        }
        
        // 손익 재계산
        calculatePnl(portfolio);
        
        // 추가 정보 업데이트
        if (request.getFirstBuyDate() != null) {
            portfolio.setFirstBuyDate(request.getFirstBuyDate());
        }
        if (request.getNotes() != null) {
            portfolio.setNotes(request.getNotes());
        }
        
        return portfolioRepository.save(portfolio);
    }
    
    /**
     * 현재가만 업데이트 (가격 갱신용)
     * 정기적으로 또는 필요시 가격만 업데이트
     */
    @Transactional
    public void updatePricesOnly(Long userId) {
        log.debug("현재가 업데이트: userId={}", userId);
        
        List<Portfolio> portfolios = portfolioRepository.findByUserIdOrderByCurrentValueDesc(userId);
        if (portfolios.isEmpty()) {
            return;
        }
        
        // 현재가 조회
        Map<String, BigDecimal> prices = realtimeService.getCurrentPrices();
        
        for (Portfolio portfolio : portfolios) {
            BigDecimal price = prices.get(portfolio.getSymbol());
            if (price != null && price.compareTo(BigDecimal.ZERO) > 0) {
                portfolio.setCurrentPrice(price);
                portfolio.setLastPriceUpdate(LocalDateTime.now());
                
                // 현재 가치 재계산
                if (portfolio.getQuantity() != null) {
                    BigDecimal currentValue = portfolio.getQuantity().multiply(price);
                    portfolio.setCurrentValue(currentValue);
                }
                
                // 손익 재계산
                calculatePnl(portfolio);
            }
        }
        
        portfolioRepository.saveAll(portfolios);
        log.debug("현재가 업데이트 완료: {}개 자산", portfolios.size());
    }
    
    /**
     * 모든 사용자의 포트폴리오 정기 동기화
     * 스케줄러로 실행 (선택적 - 현재 비활성화)
     */
    // @Scheduled(fixedDelay = 300000) // 5분마다 - 필요시 주석 해제
    @Transactional
    public void scheduledSync() {
        log.debug("정기 포트폴리오 동기화 시작");
        
        // 활성 사용자 목록
        List<User> activeUsers = userRepository.findActiveUsersWithApiKeys();
        
        for (User user : activeUsers) {
            try {
                syncNow(user.getId());
            } catch (Exception e) {
                log.error("사용자 동기화 실패: userId={}", user.getId(), e);
            }
        }
        
        log.debug("정기 포트폴리오 동기화 완료: {}명 처리", activeUsers.size());
    }
    
    // ===== Private Helper Methods =====
    
    /**
     * 실제 DB 동기화 로직
     */
    private int syncPortfolioData(Long userId, PortfolioBalanceResponse data) {
        if (data == null || data.getBalances() == null) {
            return 0;
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다"));
        
        int updatedCount = 0;
        Set<String> processedAssets = new HashSet<>();
        
        // 각 자산별로 처리
        for (AssetBalance balance : data.getBalances()) {
            String symbol = balance.getAsset() + "USDT";
            processedAssets.add(balance.getAsset());
            
            // USDT는 제외
            if ("USDT".equals(balance.getAsset())) {
                continue;
            }
            
            // 기존 포트폴리오 조회 또는 생성
            Portfolio portfolio = portfolioRepository
                    .findByUserIdAndSymbol(userId, symbol)
                    .orElse(createNewPortfolio(user, balance));
            
            // 데이터 업데이트
            updatePortfolioFromBalance(portfolio, balance);
            
            portfolioRepository.save(portfolio);
            updatedCount++;
        }
        
        // 잔고가 0이 된 자산 처리
        handleZeroBalances(userId, processedAssets);
        
        return updatedCount;
    }
    
    /**
     * 새 포트폴리오 생성
     */
    private Portfolio createNewPortfolio(User user, AssetBalance balance) {
        return Portfolio.builder()
                .user(user)
                .symbol(balance.getAsset() + "USDT")
                .asset(balance.getAsset())
                .quantity(balance.getTotal())
                .free(balance.getFree())
                .locked(balance.getLocked())
                .currentPrice(balance.getPriceUsdt())
                .currentValue(balance.getValueUsdt())
                .firstBuyDate(LocalDateTime.now())
                .lastBalanceUpdate(LocalDateTime.now())
                .lastPriceUpdate(LocalDateTime.now())
                .isManualEntry(false)
                .build();
    }
    
    /**
     * 포트폴리오 데이터 업데이트
     */
    private void updatePortfolioFromBalance(Portfolio portfolio, AssetBalance balance) {
        portfolio.setQuantity(balance.getTotal());
        portfolio.setFree(balance.getFree());
        portfolio.setLocked(balance.getLocked());
        portfolio.setCurrentPrice(balance.getPriceUsdt());
        portfolio.setCurrentValue(balance.getValueUsdt());
        portfolio.setLastBalanceUpdate(LocalDateTime.now());
        portfolio.setLastPriceUpdate(LocalDateTime.now());
        
        // 손익 계산 (평균 매수가가 있는 경우)
        calculatePnl(portfolio);
    }
    
    /**
     * 손익 계산
     */
    private void calculatePnl(Portfolio portfolio) {
        if (portfolio.getCurrentValue() == null || 
            portfolio.getTotalInvested() == null || 
            portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        
        BigDecimal pnl = portfolio.getCurrentValue().subtract(portfolio.getTotalInvested());
        portfolio.setUnrealizedPnl(pnl);
        
        BigDecimal pnlPercent = pnl.divide(portfolio.getTotalInvested(), 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
        portfolio.setUnrealizedPnlPercent(pnlPercent);
    }
    
    /**
     * 잔고가 0이 된 자산 처리
     */
    private void handleZeroBalances(Long userId, Set<String> activeAssets) {
        List<Portfolio> allPortfolios = portfolioRepository.findByUserIdOrderByCurrentValueDesc(userId);
        
        for (Portfolio portfolio : allPortfolios) {
            if (!activeAssets.contains(portfolio.getAsset())) {
                // 잔고가 0이 된 자산
                portfolio.setQuantity(BigDecimal.ZERO);
                portfolio.setFree(BigDecimal.ZERO);
                portfolio.setLocked(BigDecimal.ZERO);
                portfolio.setCurrentValue(BigDecimal.ZERO);
                portfolio.setLastBalanceUpdate(LocalDateTime.now());
                
                portfolioRepository.save(portfolio);
                log.debug("자산 잔고 0으로 업데이트: {}", portfolio.getSymbol());
            }
        }
    }
}