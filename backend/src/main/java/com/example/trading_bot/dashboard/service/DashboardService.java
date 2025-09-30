package com.example.trading_bot.dashboard.service;

import com.example.trading_bot.dashboard.dto.DashboardSummaryResponse;
import com.example.trading_bot.portfolio.repository.PortfolioRepository;
import com.example.trading_bot.strategy.repository.StrategyRepository;
import com.example.trading_bot.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService {

    private final TradeRepository tradeRepository;
    private final PortfolioRepository portfolioRepository;
    private final StrategyRepository strategyRepository;

    public DashboardSummaryResponse getSummary(Long userId) {
        log.debug("Getting dashboard summary for user: {}", userId);

        // Total trades count
        Integer totalTrades = tradeRepository.countByUserId(userId);

        // Open positions count (from portfolio)
        Integer openPositions = portfolioRepository.countByUserIdAndQuantityGreaterThan(userId, BigDecimal.ZERO);

        // Total PnL calculation
        // Realized PnL from all trades
        BigDecimal realizedPnl = tradeRepository.findByUserId(userId).stream()
                .map(trade -> trade.getRealizedPnl() != null ? trade.getRealizedPnl() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Unrealized PnL from open positions
        BigDecimal unrealizedPnl = portfolioRepository.findAllByUserId(userId).stream()
                .map(portfolio -> portfolio.getUnrealizedPnl() != null ? portfolio.getUnrealizedPnl() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Total PnL = Realized + Unrealized
        BigDecimal totalPnl = realizedPnl.add(unrealizedPnl);

        // Monthly PnL (trades from this month)
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        BigDecimal monthlyPnl = tradeRepository.findByUserIdAndEntryTimeAfter(userId, startOfMonth).stream()
                .map(trade -> trade.getRealizedPnl() != null ? trade.getRealizedPnl() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Win rate calculation (trades with positive PnL)
        List<BigDecimal> allPnls = tradeRepository.findByUserId(userId).stream()
                .map(trade -> trade.getRealizedPnl() != null ? trade.getRealizedPnl() : BigDecimal.ZERO)
                .filter(pnl -> pnl.compareTo(BigDecimal.ZERO) != 0) // Exclude zero PnL
                .toList();

        BigDecimal winRate = BigDecimal.ZERO;
        if (!allPnls.isEmpty()) {
            long winningTrades = allPnls.stream()
                    .filter(pnl -> pnl.compareTo(BigDecimal.ZERO) > 0)
                    .count();
            winRate = BigDecimal.valueOf(winningTrades)
                    .divide(BigDecimal.valueOf(allPnls.size()), 2, BigDecimal.ROUND_HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // Active strategies count
        Integer activeStrategies = strategyRepository.countByUserIdAndActive(userId, true);

        return new DashboardSummaryResponse(
                totalTrades,
                openPositions,
                totalPnl,
                monthlyPnl,
                winRate,
                activeStrategies
        );
    }
}