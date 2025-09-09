package com.example.trading_bot.portfolio.service;

import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.portfolio.dto.PortfolioResponse;
import com.example.trading_bot.portfolio.dto.PortfolioSummaryResponse;
import com.example.trading_bot.portfolio.entity.Portfolio;
import com.example.trading_bot.portfolio.repository.PortfolioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 포트폴리오 조회 전용 서비스
 * - DB에서 포트폴리오 데이터 조회만 담당
 * - 읽기 전용 트랜잭션으로 성능 최적화
 * - 외부 API 호출 없음
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioQueryService {
    
    private final PortfolioRepository portfolioRepository;
    
    /**
     * DB에 저장된 포트폴리오 조회
     * 
     * @param userId 사용자 ID
     * @return 포트폴리오 목록 (DB 데이터)
     */
    public List<PortfolioResponse> getPortfolioFromDB(Long userId) {
        log.debug("DB에서 포트폴리오 조회: userId={}", userId);
        
        List<Portfolio> portfolios = portfolioRepository.findActivePortfoliosByUserId(userId);
        
        if (portfolios.isEmpty()) {
            log.info("포트폴리오가 비어있음: userId={}", userId);
        }
        
        return portfolios.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * 포트폴리오 요약 정보 조회
     * 
     * @param userId 사용자 ID
     * @return 포트폴리오 요약 (총 가치, 손익 등)
     */
    public PortfolioSummaryResponse getPortfolioSummary(Long userId) {
        log.debug("포트폴리오 요약 조회: userId={}", userId);
        
        List<Portfolio> portfolios = portfolioRepository.findActivePortfoliosByUserId(userId);
        
        // 집계 계산
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
        
        // 수익률 계산
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
                .lastUpdate(getLastUpdateTime(portfolios))
                .build();
    }
    
    /**
     * 특정 심볼의 포트폴리오 조회
     * 
     * @param userId 사용자 ID
     * @param symbol 심볼 (예: BTCUSDT)
     * @return 포트폴리오 정보
     */
    public PortfolioResponse getPortfolioBySymbol(Long userId, String symbol) {
        log.debug("특정 심볼 포트폴리오 조회: userId={}, symbol={}", userId, symbol);
        
        Portfolio portfolio = portfolioRepository
                .findByUserIdAndSymbol(userId, symbol)
                .orElseThrow(() -> new BusinessException(
                        String.format("포트폴리오를 찾을 수 없습니다: %s", symbol),
                        HttpStatus.NOT_FOUND
                ));
        
        return toResponse(portfolio);
    }
    
    /**
     * 포트폴리오 데이터 최신성 확인
     * 
     * @param userId 사용자 ID
     * @return 데이터가 5분 이내면 true
     */
    public boolean isPortfolioDataFresh(Long userId) {
        List<Portfolio> portfolios = portfolioRepository.findActivePortfoliosByUserId(userId);
        
        if (portfolios.isEmpty()) {
            return false;
        }
        
        LocalDateTime lastUpdate = getLastUpdateTime(portfolios);
        if (lastUpdate == null) {
            return false;
        }
        
        // 5분 이내 데이터는 fresh로 판단
        boolean isFresh = lastUpdate.isAfter(LocalDateTime.now().minusMinutes(5));
        log.debug("포트폴리오 데이터 최신성: userId={}, lastUpdate={}, isFresh={}", 
                userId, lastUpdate, isFresh);
        
        return isFresh;
    }
    
    /**
     * 포트폴리오 존재 여부 확인
     * 
     * @param userId 사용자 ID
     * @return DB에 포트폴리오가 있으면 true
     */
    public boolean hasPortfolio(Long userId) {
        return portfolioRepository.existsByUserId(userId);
    }
    
    /**
     * 마지막 업데이트 시간 조회
     */
    private LocalDateTime getLastUpdateTime(List<Portfolio> portfolios) {
        return portfolios.stream()
                .map(Portfolio::getLastBalanceUpdate)
                .filter(date -> date != null)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }
    
    /**
     * Entity를 Response DTO로 변환
     */
    private PortfolioResponse toResponse(Portfolio portfolio) {
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