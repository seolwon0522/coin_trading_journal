package com.example.trading_bot.trade.application.service;

import com.example.trading_bot.trade.domain.entity.Trade;
import com.example.trading_bot.trade.domain.entity.TradeSide;
import com.example.trading_bot.trade.domain.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class TradeProfitCalculator {
    
    private final TradeRepository tradeRepository;
    
    /**
     * 매도 거래에 대한 손익 계산
     * FIFO(First In First Out) 방식으로 평균 매수 가격을 계산
     */
    public void calculateProfitLoss(Trade trade, Long userId) {
        if (trade.getSide() != TradeSide.SELL) {
            return;
        }
        
        // 동일 심볼의 이전 매수 거래들 조회
        List<Trade> previousBuyTrades = tradeRepository.findByUserIdAndSymbolAndExecutedAtBetween(
            userId,
            trade.getSymbol(),
            LocalDateTime.now().minusYears(1), // 최근 1년 데이터
            trade.getExecutedAt()
        ).stream()
            .filter(t -> t.getSide() == TradeSide.BUY)
            .filter(t -> t.getExecutedAt().isBefore(trade.getExecutedAt()))
            .toList();
        
        if (previousBuyTrades.isEmpty()) {
            log.debug("No previous buy trades found for symbol: {}", trade.getSymbol());
            return;
        }
        
        // 평균 매수 가격 계산 (가중 평균)
        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalAmount = BigDecimal.ZERO;
        
        for (Trade buyTrade : previousBuyTrades) {
            BigDecimal quantity = buyTrade.getQuantity();
            BigDecimal amount = buyTrade.getTotalAmount();
            
            totalQuantity = totalQuantity.add(quantity);
            totalAmount = totalAmount.add(amount);
        }
        
        if (totalQuantity.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        
        // 평균 매수 가격
        BigDecimal averageEntryPrice = totalAmount.divide(totalQuantity, 8, RoundingMode.HALF_UP);
        trade.setAverageEntryPrice(averageEntryPrice);
        
        // 손익 계산
        BigDecimal priceDiff = trade.getPrice().subtract(averageEntryPrice);
        BigDecimal profitLoss = priceDiff.multiply(trade.getQuantity());
        
        // 수수료 차감
        if (trade.getFee() != null) {
            profitLoss = profitLoss.subtract(trade.getFee());
        }
        
        trade.setProfitLoss(profitLoss);
        
        // 손익률 계산
        if (averageEntryPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal profitLossPercentage = priceDiff
                .divide(averageEntryPrice, 6, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
            trade.setProfitLossPercentage(profitLossPercentage);
        }
        
        // 실현 손익 설정
        trade.setRealizedPnl(profitLoss);
        
        log.debug("Profit/Loss calculated for trade {}: {} ({}%)", 
            trade.getId(), 
            profitLoss, 
            trade.getProfitLossPercentage()
        );
    }
    
    /**
     * 특정 기간의 총 손익 계산
     */
    public BigDecimal calculateTotalProfitLoss(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        BigDecimal totalProfitLoss = tradeRepository.sumProfitLossByUserIdAndDateRange(
            userId, startDate, endDate
        );
        return totalProfitLoss != null ? totalProfitLoss : BigDecimal.ZERO;
    }
    
    /**
     * 승률 계산
     */
    public BigDecimal calculateWinRate(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        Long totalTrades = tradeRepository.countByUserIdAndDateRange(userId, startDate, endDate);
        if (totalTrades == null || totalTrades == 0) {
            return BigDecimal.ZERO;
        }
        
        Long profitableTrades = tradeRepository.countProfitableTradesByUserIdAndDateRange(
            userId, startDate, endDate
        );
        if (profitableTrades == null) {
            return BigDecimal.ZERO;
        }
        
        return new BigDecimal(profitableTrades)
            .divide(new BigDecimal(totalTrades), 4, RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100"));
    }
    
    /**
     * 평균 수익률 계산
     */
    public BigDecimal calculateAverageReturn(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        BigDecimal avgReturn = tradeRepository.averageProfitLossPercentageByUserIdAndDateRange(
            userId, startDate, endDate
        );
        return avgReturn != null ? avgReturn : BigDecimal.ZERO;
    }
}