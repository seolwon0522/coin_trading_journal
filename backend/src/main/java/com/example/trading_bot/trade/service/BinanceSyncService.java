package com.example.trading_bot.trade.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.trade.entity.*;
import com.example.trading_bot.trade.repository.TradeRepository;
import com.example.trading_bot.binance.client.BinanceApiClient;
import com.example.trading_bot.binance.dto.BinanceTradeResponse;
import com.example.trading_bot.trade.service.CryptoService;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BinanceSyncService {
    
    private final BinanceApiClient binanceApiClient;
    private final TradeRepository tradeRepository;
    private final CryptoService cryptoService;
    private final TradeProfitCalculator profitCalculator;
    
    /**
     * Binance에서 거래 내역을 동기화합니다.
     * 
     * @param user 사용자
     * @param apiKey API 키
     * @param encryptedSecretKey 암호화된 Secret Key
     * @param symbol 거래 심볼
     * @param startTime 시작 시간
     * @param endTime 종료 시간
     * @return 동기화된 거래 개수
     */
    public int syncTrades(
        User user,
        String apiKey,
        String encryptedSecretKey,
        String symbol,
        LocalDateTime startTime,
        LocalDateTime endTime
    ) {
        try {
            log.info("Starting Binance trade sync for user {} and symbol {}", user.getId(), symbol);
            
            // Secret Key 복호화
            String secretKey = cryptoService.decrypt(encryptedSecretKey);
            
            // 시간을 밀리초로 변환
            Long startTimeMs = startTime != null ? 
                startTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null;
            Long endTimeMs = endTime != null ? 
                endTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null;
            
            // Binance API 호출
            List<BinanceTradeResponse> binanceTrades = binanceApiClient.getMyTrades(
                apiKey,
                secretKey,
                symbol,
                startTimeMs,
                endTimeMs,
                1000
            );
            
            // 이미 저장된 거래 ID 조회
            Set<String> existingExternalIds = tradeRepository
                .findByUserIdAndSource(user.getId(), TradeSource.BINANCE)
                .stream()
                .map(Trade::getExternalId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
            
            // 새로운 거래만 필터링하고 변환
            List<Trade> newTrades = new ArrayList<>();
            for (BinanceTradeResponse binanceTrade : binanceTrades) {
                String externalId = "BINANCE_" + binanceTrade.getId();
                
                if (!existingExternalIds.contains(externalId)) {
                    Trade trade = convertToTrade(binanceTrade, user, symbol);
                    newTrades.add(trade);
                }
            }
            
            // 거래 저장
            if (!newTrades.isEmpty()) {
                List<Trade> savedTrades = tradeRepository.saveAll(newTrades);
                
                // 손익 계산
                for (Trade trade : savedTrades) {
                    if (trade.getSide() == TradeSide.SELL) {
                        profitCalculator.calculateProfitLoss(trade, user.getId());
                        tradeRepository.save(trade);
                    }
                }
                
                log.info("Synced {} new trades for user {}", newTrades.size(), user.getId());
            }
            
            return newTrades.size();
            
        } catch (Exception e) {
            log.error("Failed to sync trades from Binance", e);
            throw new BusinessException("Binance 거래 동기화 실패: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * 비동기로 모든 심볼의 거래를 동기화합니다.
     */
    @Async
    public void syncAllTradesAsync(
        User user,
        String apiKey,
        String encryptedSecretKey,
        List<String> symbols,
        LocalDateTime startTime,
        LocalDateTime endTime
    ) {
        log.info("Starting async sync for {} symbols", symbols.size());
        
        for (String symbol : symbols) {
            try {
                syncTrades(user, apiKey, encryptedSecretKey, symbol, startTime, endTime);
                Thread.sleep(1000); // Rate limiting
            } catch (Exception e) {
                log.error("Failed to sync trades for symbol {}", symbol, e);
            }
        }
        
        log.info("Async sync completed for user {}", user.getId());
    }
    
    /**
     * API 키를 검증합니다.
     * 
     * @param apiKey API 키
     * @param secretKey Secret Key
     * @return 유효한 경우 true
     */
    public boolean validateApiKeys(String apiKey, String secretKey) {
        try {
            return binanceApiClient.validateApiKeys(apiKey, secretKey);
        } catch (Exception e) {
            log.warn("API key validation failed", e);
            return false;
        }
    }
    
    /**
     * Binance 거래 응답을 Trade 엔티티로 변환합니다.
     */
    private Trade convertToTrade(BinanceTradeResponse binanceTrade, User user, String symbol) {
        // 시간 변환
        LocalDateTime executedAt = LocalDateTime.ofInstant(
            Instant.ofEpochMilli(binanceTrade.getTime()),
            ZoneId.systemDefault()
        );
        
        // 매수/매도 판단
        TradeSide side = binanceTrade.getIsBuyer() ? TradeSide.BUY : TradeSide.SELL;
        
        // 총 금액 계산
        BigDecimal totalAmount = binanceTrade.getPrice()
            .multiply(binanceTrade.getQuantity());
        
        return Trade.builder()
            .user(user)
            .symbol(symbol)
            .type(TradeType.SPOT)
            .side(side)
            .quantity(binanceTrade.getQuantity())
            .price(binanceTrade.getPrice())
            .totalAmount(totalAmount)
            .fee(binanceTrade.getCommission())
            .feeAsset(binanceTrade.getCommissionAsset())
            .status(TradeStatus.EXECUTED)
            .source(TradeSource.BINANCE)
            .externalId("BINANCE_" + binanceTrade.getId())
            .executedAt(executedAt)
            .build();
    }
}