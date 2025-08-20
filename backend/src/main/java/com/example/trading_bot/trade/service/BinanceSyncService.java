package com.example.trading_bot.trade.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.trade.entity.*;
import com.example.trading_bot.trade.repository.TradeRepository;
import com.example.trading_bot.binance.client.BinanceApiClient;
import com.example.trading_bot.binance.dto.BinanceTradeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BinanceSyncService {
    
    private static final int BINANCE_MAX_LIMIT = 1000;
    private static final long RATE_LIMIT_DELAY_MS = 1000L;
    
    private final BinanceApiClient binanceApiClient;
    private final TradeRepository tradeRepository;
    private final CryptoService cryptoService;
    private final TradeProfitCalculator profitCalculator;
    
    public int syncTrades(
        User user,
        String apiKey,
        String encryptedSecretKey,
        String symbol,
        LocalDateTime startTime,
        LocalDateTime endTime
    ) {
        try {
            String secretKey = cryptoService.decrypt(encryptedSecretKey);
            
            Long startTimeMs = toEpochMilli(startTime);
            Long endTimeMs = toEpochMilli(endTime);
            
            List<BinanceTradeResponse> binanceTrades = binanceApiClient.getMyTrades(
                apiKey, secretKey, symbol, startTimeMs, endTimeMs, BINANCE_MAX_LIMIT
            );
            
            // 기존 거래 ID들을 Set으로 한번에 조회 (성능 개선)
            Set<String> existingIds = tradeRepository.findExternalIdsByUserIdAndSource(
                user.getId(), TradeSource.BINANCE
            );
            
            // 새 거래만 필터링하여 엔티티로 변환
            List<Trade> newTrades = binanceTrades.stream()
                .filter(bt -> !existingIds.contains("BINANCE_" + bt.getId()))
                .map(bt -> convertToTrade(bt, user, symbol))
                .toList();
            
            if (newTrades.isEmpty()) {
                return 0;
            }
            
            // 배치 저장 및 손익 계산
            List<Trade> savedTrades = tradeRepository.saveAll(newTrades);
            processSellTrades(savedTrades, user.getId());
            
            return newTrades.size();
            
        } catch (Exception e) {
            throw new BusinessException("Binance 거래 동기화 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @Async
    public CompletableFuture<Void> syncAllTradesAsync(
        User user,
        String apiKey,
        String encryptedSecretKey,
        List<String> symbols,
        LocalDateTime startTime,
        LocalDateTime endTime
    ) {
        return CompletableFuture.runAsync(() -> {
            symbols.forEach(symbol -> {
                try {
                    syncTrades(user, apiKey, encryptedSecretKey, symbol, startTime, endTime);
                    // Rate limiting with CompletableFuture delay
                    CompletableFuture.delayedExecutor(RATE_LIMIT_DELAY_MS, TimeUnit.MILLISECONDS).execute(() -> {});
                } catch (Exception e) {
                    log.error("Symbol {} 동기화 실패: {}", symbol, e.getMessage());
                }
            });
        });
    }
    
    public boolean validateApiKeys(String apiKey, String secretKey) {
        try {
            return binanceApiClient.validateApiKeys(apiKey, secretKey);
        } catch (Exception e) {
            return false;
        }
    }
    
    // === Private Helper Methods ===
    
    private void processSellTrades(List<Trade> trades, Long userId) {
        // SELL 거래만 필터링하여 한번에 처리
        List<Trade> sellTrades = trades.stream()
            .filter(t -> t.getSide() == TradeSide.SELL)
            .toList();
        
        if (!sellTrades.isEmpty()) {
            sellTrades.forEach(trade -> profitCalculator.calculateProfitLoss(trade, userId));
            tradeRepository.saveAll(sellTrades);
        }
    }
    
    private Trade convertToTrade(BinanceTradeResponse binanceTrade, User user, String symbol) {
        return Trade.builder()
            .user(user)
            .symbol(symbol)
            .type(TradeType.SPOT)
            .side(binanceTrade.getIsBuyer() ? TradeSide.BUY : TradeSide.SELL)
            .quantity(binanceTrade.getQuantity())
            .price(binanceTrade.getPrice())
            .totalAmount(binanceTrade.getPrice().multiply(binanceTrade.getQuantity()))
            .fee(binanceTrade.getCommission())
            .feeAsset(binanceTrade.getCommissionAsset())
            .status(TradeStatus.EXECUTED)
            .source(TradeSource.BINANCE)
            .externalId("BINANCE_" + binanceTrade.getId())
            .executedAt(LocalDateTime.ofInstant(
                Instant.ofEpochMilli(binanceTrade.getTime()),
                ZoneId.systemDefault()
            ))
            .build();
    }
    
    private Long toEpochMilli(LocalDateTime dateTime) {
        return dateTime != null 
            ? dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() 
            : null;
    }
}