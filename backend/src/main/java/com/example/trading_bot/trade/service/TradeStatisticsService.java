package com.example.trading_bot.trade.service;

import com.example.trading_bot.trade.dto.TradeStatisticsResponse;
import com.example.trading_bot.trade.entity.Trade;
import com.example.trading_bot.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TradeStatisticsService {
    
    private final TradeRepository tradeRepository;
    private final TradeProfitCalculator profitCalculator;
    
    public TradeStatisticsResponse getStatistics(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Calculating statistics for user {} from {} to {}", userId, startDate, endDate);
        
        // 기본 통계
        Long totalTrades = tradeRepository.countByUserIdAndDateRange(userId, startDate, endDate);
        if (totalTrades == null || totalTrades == 0) {
            return createEmptyStatistics(startDate, endDate);
        }
        
        // 거래 데이터 조회 (최대 1000건으로 제한)
        List<Trade> trades = tradeRepository.findByUserIdAndExecutedAtBetween(
            userId, startDate, endDate, PageRequest.of(0, 1000, Sort.by("executedAt").descending())
        ).getContent();
        
        // 손익 통계 계산
        TradeStatisticsResponse stats = TradeStatisticsResponse.builder()
            .startDate(startDate)
            .endDate(endDate)
            .totalTrades(totalTrades)
            .build();
        
        calculateProfitLossStatistics(stats, trades);
        calculateVolumeStatistics(stats, trades);
        calculateFrequencyStatistics(stats, startDate, endDate, totalTrades);
        calculateSymbolStatistics(stats, trades, userId);
        calculateRiskMetrics(stats, trades);
        
        return stats;
    }
    
    private void calculateProfitLossStatistics(TradeStatisticsResponse stats, List<Trade> trades) {
        List<Trade> tradesWithPnL = trades.stream()
            .filter(t -> t.getProfitLoss() != null)
            .toList();
        
        if (tradesWithPnL.isEmpty()) {
            stats.setWinningTrades(0L);
            stats.setLosingTrades(0L);
            stats.setWinRate(BigDecimal.ZERO);
            stats.setTotalProfitLoss(BigDecimal.ZERO);
            return;
        }
        
        // 승/패 거래 분류
        List<Trade> winningTrades = tradesWithPnL.stream()
            .filter(t -> t.getProfitLoss().compareTo(BigDecimal.ZERO) > 0)
            .toList();
        
        List<Trade> losingTrades = tradesWithPnL.stream()
            .filter(t -> t.getProfitLoss().compareTo(BigDecimal.ZERO) < 0)
            .toList();
        
        stats.setWinningTrades((long) winningTrades.size());
        stats.setLosingTrades((long) losingTrades.size());
        
        // 승률 계산
        if (!tradesWithPnL.isEmpty()) {
            BigDecimal winRate = new BigDecimal(winningTrades.size())
                .divide(new BigDecimal(tradesWithPnL.size()), 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
            stats.setWinRate(winRate);
        }
        
        // 총 손익
        BigDecimal totalProfitLoss = tradesWithPnL.stream()
            .map(Trade::getProfitLoss)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalProfitLoss(totalProfitLoss);
        
        // 총 이익
        BigDecimal totalProfit = winningTrades.stream()
            .map(Trade::getProfitLoss)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalProfit(totalProfit);
        
        // 총 손실
        BigDecimal totalLoss = losingTrades.stream()
            .map(Trade::getProfitLoss)
            .map(BigDecimal::abs)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalLoss(totalLoss);
        
        // 평균 이익/손실
        if (!winningTrades.isEmpty()) {
            BigDecimal avgProfit = totalProfit.divide(
                new BigDecimal(winningTrades.size()), 8, RoundingMode.HALF_UP
            );
            stats.setAverageProfit(avgProfit);
        }
        
        if (!losingTrades.isEmpty()) {
            BigDecimal avgLoss = totalLoss.divide(
                new BigDecimal(losingTrades.size()), 8, RoundingMode.HALF_UP
            );
            stats.setAverageLoss(avgLoss);
        }
        
        // 평균 수익률
        BigDecimal totalReturnPct = tradesWithPnL.stream()
            .map(Trade::getProfitLossPercentage)
            .filter(pct -> pct != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (!tradesWithPnL.isEmpty()) {
            BigDecimal avgReturn = totalReturnPct.divide(
                new BigDecimal(tradesWithPnL.size()), 4, RoundingMode.HALF_UP
            );
            stats.setAverageReturn(avgReturn);
        }
        
        // 최대 이익/손실
        winningTrades.stream()
            .map(Trade::getProfitLoss)
            .max(BigDecimal::compareTo)
            .ifPresent(stats::setLargestWin);
        
        losingTrades.stream()
            .map(Trade::getProfitLoss)
            .map(BigDecimal::abs)
            .max(BigDecimal::compareTo)
            .ifPresent(stats::setLargestLoss);
        
        // 최고/최저 수익률
        tradesWithPnL.stream()
            .map(Trade::getProfitLossPercentage)
            .filter(pct -> pct != null)
            .max(BigDecimal::compareTo)
            .ifPresent(stats::setBestWinRate);
        
        tradesWithPnL.stream()
            .map(Trade::getProfitLossPercentage)
            .filter(pct -> pct != null)
            .min(BigDecimal::compareTo)
            .ifPresent(stats::setWorstLossRate);
    }
    
    private void calculateVolumeStatistics(TradeStatisticsResponse stats, List<Trade> trades) {
        // 총 거래량
        BigDecimal totalVolume = trades.stream()
            .map(Trade::getTotalAmount)
            .filter(amount -> amount != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        stats.setTotalVolume(totalVolume);
        
        // 평균 거래 크기
        if (!trades.isEmpty()) {
            BigDecimal avgTradeSize = totalVolume.divide(
                new BigDecimal(trades.size()), 8, RoundingMode.HALF_UP
            );
            stats.setAverageTradeSize(avgTradeSize);
        }
    }
    
    private void calculateFrequencyStatistics(
        TradeStatisticsResponse stats, 
        LocalDateTime startDate, 
        LocalDateTime endDate, 
        Long totalTrades
    ) {
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        long weeks = (days + 6) / 7;
        long months = ChronoUnit.MONTHS.between(startDate, endDate) + 1;
        
        // 일별 평균 거래 수
        if (days > 0) {
            BigDecimal tradesPerDay = new BigDecimal(totalTrades)
                .divide(new BigDecimal(days), 2, RoundingMode.HALF_UP);
            stats.setTradesPerDay(tradesPerDay);
        }
        
        // 주별 평균 거래 수
        if (weeks > 0) {
            BigDecimal tradesPerWeek = new BigDecimal(totalTrades)
                .divide(new BigDecimal(weeks), 2, RoundingMode.HALF_UP);
            stats.setTradesPerWeek(tradesPerWeek);
        }
        
        // 월별 평균 거래 수
        if (months > 0) {
            BigDecimal tradesPerMonth = new BigDecimal(totalTrades)
                .divide(new BigDecimal(months), 2, RoundingMode.HALF_UP);
            stats.setTradesPerMonth(tradesPerMonth);
        }
    }
    
    private void calculateSymbolStatistics(TradeStatisticsResponse stats, List<Trade> trades, Long userId) {
        // 심볼별 거래 횟수
        Map<String, Long> symbolCounts = trades.stream()
            .collect(Collectors.groupingBy(Trade::getSymbol, Collectors.counting()));
        
        // 가장 많이 거래한 심볼
        symbolCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(entry -> stats.setMostTradedSymbol(entry.getKey()));
        
        // 심볼별 손익
        Map<String, BigDecimal> symbolProfits = trades.stream()
            .filter(t -> t.getProfitLoss() != null)
            .collect(Collectors.groupingBy(
                Trade::getSymbol,
                Collectors.reducing(
                    BigDecimal.ZERO,
                    Trade::getProfitLoss,
                    BigDecimal::add
                )
            ));
        
        // 가장 수익성 높은 심볼
        symbolProfits.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .ifPresent(entry -> stats.setMostProfitableSymbol(entry.getKey()));
        
        // 가장 수익성 낮은 심볼
        symbolProfits.entrySet().stream()
            .min(Map.Entry.comparingByValue())
            .ifPresent(entry -> stats.setLeastProfitableSymbol(entry.getKey()));
        
        // 고유 심볼 수
        stats.setUniqueSymbolsCount(symbolCounts.size());
    }
    
    private void calculateRiskMetrics(TradeStatisticsResponse stats, List<Trade> trades) {
        // Profit Factor 계산 (총 이익 / 총 손실)
        if (stats.getTotalLoss() != null && stats.getTotalLoss().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal profitFactor = stats.getTotalProfit()
                .divide(stats.getTotalLoss(), 2, RoundingMode.HALF_UP);
            stats.setProfitFactor(profitFactor);
        }
        
        // 평균 리스크/리워드 비율
        List<BigDecimal> riskRewardRatios = trades.stream()
            .map(Trade::getRiskRewardRatio)
            .filter(ratio -> ratio != null)
            .toList();
        
        if (!riskRewardRatios.isEmpty()) {
            BigDecimal avgRiskReward = riskRewardRatios.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(new BigDecimal(riskRewardRatios.size()), 4, RoundingMode.HALF_UP);
            stats.setAverageRiskRewardRatio(avgRiskReward);
        }
        
        // 최대 드로우다운 계산 (간단한 버전)
        calculateMaxDrawdown(stats, trades);
    }
    
    private void calculateMaxDrawdown(TradeStatisticsResponse stats, List<Trade> trades) {
        if (trades.isEmpty()) {
            stats.setMaxDrawdown(BigDecimal.ZERO);
            return;
        }
        
        BigDecimal peak = BigDecimal.ZERO;
        BigDecimal maxDrawdown = BigDecimal.ZERO;
        BigDecimal runningPnL = BigDecimal.ZERO;
        
        for (Trade trade : trades) {
            if (trade.getProfitLoss() != null) {
                runningPnL = runningPnL.add(trade.getProfitLoss());
                
                if (runningPnL.compareTo(peak) > 0) {
                    peak = runningPnL;
                }
                
                BigDecimal drawdown = peak.subtract(runningPnL);
                if (drawdown.compareTo(maxDrawdown) > 0) {
                    maxDrawdown = drawdown;
                }
            }
        }
        
        stats.setMaxDrawdown(maxDrawdown);
    }
    
    private TradeStatisticsResponse createEmptyStatistics(LocalDateTime startDate, LocalDateTime endDate) {
        return TradeStatisticsResponse.builder()
            .startDate(startDate)
            .endDate(endDate)
            .totalTrades(0L)
            .winningTrades(0L)
            .losingTrades(0L)
            .winRate(BigDecimal.ZERO)
            .totalProfitLoss(BigDecimal.ZERO)
            .totalProfit(BigDecimal.ZERO)
            .totalLoss(BigDecimal.ZERO)
            .totalVolume(BigDecimal.ZERO)
            .uniqueSymbolsCount(0)
            .build();
    }
}