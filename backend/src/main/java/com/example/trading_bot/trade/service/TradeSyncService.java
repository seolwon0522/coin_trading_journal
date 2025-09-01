package com.example.trading_bot.trade.service;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.binance.client.BinanceApiClient;
import com.example.trading_bot.binance.dto.BinanceTradeResponse;
import com.example.trading_bot.common.exception.BusinessException;
import com.example.trading_bot.common.util.CryptoUtils;
import com.example.trading_bot.trade.dto.TradeSyncRequest;
import com.example.trading_bot.trade.dto.TradeSyncResponse;
import com.example.trading_bot.trade.entity.Trade;
import com.example.trading_bot.trade.entity.UserApiKey;
import com.example.trading_bot.trade.repository.TradeRepository;
import com.example.trading_bot.trade.repository.UserApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 거래 동기화 서비스 (단순화 버전)
 * Binance API에서 제공하는 데이터를 그대로 저장합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TradeSyncService {
    
    private final TradeRepository tradeRepository;
    private final UserRepository userRepository;
    private final UserApiKeyRepository apiKeyRepository;
    private final UserApiKeyService apiKeyService;
    private final BinanceApiClient binanceApiClient;
    private final CryptoUtils cryptoUtils;
    
    /**
     * Binance 거래 내역 동기화
     * 
     * @param userId 사용자 ID
     * @param request 동기화 요청 정보
     * @return 동기화 결과
     */
    @Transactional
    public TradeSyncResponse syncBinanceTrades(Long userId, TradeSyncRequest request) {
        log.info("거래 동기화 시작: userId={}, symbols={}", userId, request.getSymbols());
        
        // API 키 조회
        UserApiKey apiKey = apiKeyRepository
                .findByUserIdAndExchangeAndIsActiveTrue(userId, "BINANCE")
                .orElseThrow(() -> new BusinessException("활성 Binance API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 시크릿 키 복호화
        String secretKey = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
        
        // 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 심볼 목록 준비
        List<String> symbols = request.getSymbols();
        if (symbols == null || symbols.isEmpty()) {
            symbols = getDefaultSymbols();
        }
        
        int totalImported = 0;
        int newTrades = 0;
        int duplicates = 0;
        List<String> errors = new ArrayList<>();
        
        // 각 심볼별로 거래 내역 가져오기
        for (String symbol : symbols) {
            try {
                log.debug("{} 거래 내역 가져오기 시작", symbol);
                
                // Binance API 호출
                List<BinanceTradeResponse> binanceTrades = binanceApiClient.getMyTrades(
                        apiKey.getApiKey(),
                        secretKey,
                        symbol,
                        request.getStartTime(),
                        request.getEndTime(),
                        request.getLimit() != null ? request.getLimit() : 500
                );
                
                // 거래 내역 저장
                for (BinanceTradeResponse binanceTrade : binanceTrades) {
                    totalImported++;
                    
                    // 중복 확인
                    boolean exists = tradeRepository.existsByUserIdAndExchangeTradeId(
                            userId, 
                            String.valueOf(binanceTrade.getId())
                    );
                    
                    if (!exists) {
                        Trade trade = convertBinanceToTrade(binanceTrade, user);
                        tradeRepository.save(trade);
                        newTrades++;
                    } else {
                        duplicates++;
                    }
                }
                
                log.debug("{} 거래 {}개 처리 완료", symbol, binanceTrades.size());
                
            } catch (Exception e) {
                log.error("{} 동기화 실패: {}", symbol, e.getMessage());
                errors.add(String.format("%s: %s", symbol, e.getMessage()));
            }
        }
        
        // 동기화 성공/실패 처리
        if (errors.isEmpty()) {
            apiKeyService.updateSyncSuccess(userId, "BINANCE");
        } else {
            apiKeyService.incrementSyncFailureCount(userId, "BINANCE");
        }
        
        log.info("거래 동기화 완료: userId={}, 총 {}개 중 {}개 추가, {}개 중복", 
                userId, totalImported, newTrades, duplicates);
        
        return TradeSyncResponse.builder()
                .totalProcessed(totalImported)
                .newTrades(newTrades)
                .duplicates(duplicates)
                .errors(errors)
                .syncTime(LocalDateTime.now())
                .build();
    }
    
    /**
     * Binance 거래 데이터를 내부 Trade 엔티티로 변환
     * 단순 매핑만 수행하고 계산은 하지 않습니다.
     */
    private Trade convertBinanceToTrade(BinanceTradeResponse binance, User user) {
        // 시간 변환
        LocalDateTime tradeTime = LocalDateTime.ofInstant(
                Instant.ofEpochMilli(binance.getTime()),
                ZoneId.systemDefault()
        );
        
        // Binance API 데이터 그대로 저장
        return Trade.builder()
                .user(user)
                .symbol(binance.getSymbol())
                .side(binance.getIsBuyer() ? "BUY" : "SELL")
                .entryPrice(binance.getPrice())
                .entryQuantity(binance.getQty())
                .entryTime(tradeTime)
                .exchange("BINANCE")
                .exchangeTradeId(String.valueOf(binance.getId()))
                .quoteQuantity(binance.getQuoteQty())
                .commission(binance.getCommission())
                .commissionAsset(binance.getCommissionAsset())
                .isMaker(binance.getIsMaker())
                .notes("Binance API 자동 동기화")
                .build();
    }
    
    /**
     * 빠른 동기화 - 최근 24시간 거래 내역
     * 
     * @param userId 사용자 ID
     * @return 동기화 결과
     */
    @Transactional
    public TradeSyncResponse quickSync(Long userId) {
        long endTime = System.currentTimeMillis();
        long startTime = endTime - (24 * 60 * 60 * 1000); // 24시간 전
        
        TradeSyncRequest request = TradeSyncRequest.builder()
                .startTime(startTime)
                .endTime(endTime)
                .limit(100)
                .build();
        
        return syncBinanceTrades(userId, request);
    }
    
    /**
     * 기본 심볼 목록 반환
     */
    private List<String> getDefaultSymbols() {
        return Arrays.asList("BTCUSDT", "ETHUSDT", "BNBUSDT");
    }
}