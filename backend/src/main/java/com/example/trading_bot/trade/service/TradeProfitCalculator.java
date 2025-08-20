package com.example.trading_bot.trade.service;

import com.example.trading_bot.trade.entity.Trade;
import com.example.trading_bot.trade.entity.TradeSide;
import com.example.trading_bot.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TradeProfitCalculator {
    
    private static final int PRICE_SCALE = 8;
    private static final int PERCENTAGE_SCALE = 6;
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    
    private final TradeRepository tradeRepository;
    
    /**
     * 매도 거래에 대한 손익 계산 (평균 가격 방식)
     */
    public void calculateProfitLoss(Trade trade, Long userId) {
        if (trade.getSide() != TradeSide.SELL) {
            return;
        }
        
        // 최근 매수 거래들 조회 (DB에서 필터링하여 효율성 개선)
        List<Trade> recentBuyTrades = tradeRepository.findRecentBuyTrades(
            userId, 
            trade.getSymbol(), 
            trade.getExecutedAt().minusMonths(3), // 3개월로 제한
            trade.getExecutedAt(),
            PageRequest.of(0, 100) // 최대 100개로 제한
        );
        
        if (recentBuyTrades.isEmpty()) {
            return;
        }
        
        BigDecimal averageEntryPrice = calculateWeightedAveragePrice(recentBuyTrades);
        if (averageEntryPrice == null) {
            return;
        }
        
        trade.setAverageEntryPrice(averageEntryPrice);
        
        // 손익 및 손익률 계산
        BigDecimal priceDiff = trade.getPrice().subtract(averageEntryPrice);
        BigDecimal profitLoss = priceDiff.multiply(trade.getQuantity());
        
        if (trade.getFee() != null) {
            profitLoss = profitLoss.subtract(trade.getFee());
        }
        
        trade.setProfitLoss(profitLoss);
        trade.setRealizedPnl(profitLoss);
        
        // 손익률 계산
        if (averageEntryPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal profitLossPercentage = priceDiff
                .divide(averageEntryPrice, PERCENTAGE_SCALE, RoundingMode.HALF_UP)
                .multiply(HUNDRED);
            trade.setProfitLossPercentage(profitLossPercentage);
        }
    }
    
    public BigDecimal calculateTotalProfitLoss(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        BigDecimal total = tradeRepository.sumProfitLossByUserIdAndDateRange(userId, startDate, endDate);
        return total != null ? total : BigDecimal.ZERO;
    }
    
    public BigDecimal calculateWinRate(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        Long totalTrades = tradeRepository.countByUserIdAndDateRange(userId, startDate, endDate);
        if (totalTrades == null || totalTrades == 0) {
            return BigDecimal.ZERO;
        }
        
        Long profitableTrades = tradeRepository.countProfitableTradesByUserIdAndDateRange(userId, startDate, endDate);
        if (profitableTrades == null) {
            return BigDecimal.ZERO;
        }
        
        return BigDecimal.valueOf(profitableTrades)
            .divide(BigDecimal.valueOf(totalTrades), 4, RoundingMode.HALF_UP)
            .multiply(HUNDRED);
    }
    
    public BigDecimal calculateAverageReturn(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        BigDecimal avgReturn = tradeRepository.averageProfitLossPercentageByUserIdAndDateRange(userId, startDate, endDate);
        return avgReturn != null ? avgReturn : BigDecimal.ZERO;
    }
    
    // === Private Helper Methods ===
    
    private BigDecimal calculateWeightedAveragePrice(List<Trade> trades) {
        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalAmount = BigDecimal.ZERO;
        
        for (Trade trade : trades) {
            totalQuantity = totalQuantity.add(trade.getQuantity());
            totalAmount = totalAmount.add(trade.getTotalAmount());
        }
        
        if (totalQuantity.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        
        return totalAmount.divide(totalQuantity, PRICE_SCALE, RoundingMode.HALF_UP);
    }
}