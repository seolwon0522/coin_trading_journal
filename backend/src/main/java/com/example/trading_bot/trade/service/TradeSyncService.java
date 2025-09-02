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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

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
     * 빠른 동기화 - 최근 30일 거래 내역 (개선된 버전)
     * 
     * @param userId 사용자 ID
     * @return 동기화 결과
     */
    @Transactional
    public TradeSyncResponse quickSync(Long userId) {
        log.info("개선된 빠른 동기화 시작: userId={}", userId);
        
        // API 키 조회
        UserApiKey apiKey = apiKeyRepository
                .findByUserIdAndExchangeAndIsActiveTrue(userId, "BINANCE")
                .orElseThrow(() -> new BusinessException("활성 Binance API 키를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 시크릿 키 복호화
        String secretKey = cryptoUtils.decrypt(apiKey.getEncryptedSecretKey());
        
        // 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("사용자를 찾을 수 없습니다", HttpStatus.NOT_FOUND));
        
        // 1. 먼저 계정 잔고를 조회하여 보유한 자산 확인
        List<String> symbolsToSync = new ArrayList<>();
        try {
            log.info("계정 잔고 조회 중...");
            List<Map<String, Object>> balances = binanceApiClient.getAccountBalances(
                    apiKey.getApiKey(), 
                    secretKey
            );
            
            // USDT를 제외한 모든 자산에 대해 USDT 페어 생성
            for (Map<String, Object> balance : balances) {
                String asset = (String) balance.get("asset");
                double total = (Double) balance.get("total");
                
                // USDT는 제외, 잔고가 일정 수준 이상인 자산만
                if (!"USDT".equals(asset) && total > 0.00001) {
                    symbolsToSync.add(asset + "USDT");
                    log.debug("동기화 대상 추가: {} (잔고: {})", asset + "USDT", total);
                }
            }
            
            // 보유 자산이 없으면 기본 심볼 사용
            if (symbolsToSync.isEmpty()) {
                log.info("보유 자산이 없어 기본 심볼 사용");
                symbolsToSync = getDefaultSymbols();
            }
            
        } catch (Exception e) {
            log.warn("잔고 조회 실패, 기본 심볼 사용: {}", e.getMessage());
            symbolsToSync = getDefaultSymbols();
        }
        
        // 2. 시간 범위 설정
        long endTime = System.currentTimeMillis();
        long twentyFourHours = 24L * 60 * 60 * 1000;  // 24시간
        long thirtyDays = 30L * 24 * 60 * 60 * 1000;  // 30일
        
        int totalImported = 0;
        int newTrades = 0;
        int duplicates = 0;
        List<String> errors = new ArrayList<>();
        
        // 3. 각 심볼별로 주문 내역 가져오기 (하이브리드: getAllOrders + myTrades)
        for (String symbol : symbolsToSync) {
            try {
                log.info("{} 주문 내역 가져오기 시작", symbol);
                
                // getAllOrders는 최근 24시간만 (API 제한)
                List<Map<String, Object>> orders = binanceApiClient.getAllOrders(
                        apiKey.getApiKey(),
                        secretKey,
                        symbol,
                        endTime - twentyFourHours,  // 24시간 전
                        endTime,
                        500  // 최대 500개
                );
                
                log.info("{} - getAllOrders에서 최근 24시간 내 {}개 주문 반환됨", symbol, orders.size());
                
                // myTrades는 30일간 조회 (더 긴 기간 가능)
                try {
                    List<BinanceTradeResponse> trades = binanceApiClient.getMyTrades(
                            apiKey.getApiKey(),
                            secretKey,
                            symbol,
                            endTime - thirtyDays,  // 30일 전
                            endTime,
                            500
                    );
                    log.info("{} - myTrades에서 최근 30일간 {}개 거래 반환됨 (매수+매도 완료된 거래)", symbol, trades.size());
                    
                    // myTrades 데이터도 처리 (나중에 병합)
                    for (BinanceTradeResponse trade : trades) {
                        String tradeId = String.valueOf(trade.getId());
                        boolean exists = tradeRepository.existsByUserIdAndExchangeTradeId(userId, tradeId);
                        
                        if (!exists) {
                            try {
                                Trade newTrade = convertBinanceToTrade(trade, user);
                                Trade saved = tradeRepository.save(newTrade);
                                if (saved.getId() != null) {
                                    newTrades++;
                                    log.info("myTrades에서 새 거래 저장: {}", tradeId);
                                }
                            } catch (Exception e) {
                                log.error("myTrades 거래 저장 실패: {}", e.getMessage());
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("myTrades 호출 실패 (매수만 있는 경우 정상): {}", e.getMessage());
                }
                
                // 각 심볼별 카운터
                int symbolFilledCount = 0;
                int symbolNewCount = 0;
                int symbolDuplicateCount = 0;
                
                // 완료된 주문만 필터링하여 저장
                for (Map<String, Object> order : orders) {
                    String status = (String) order.get("status");
                    String orderId = String.valueOf(order.get("orderId"));
                    
                    // 중요: 모든 주문 상태를 INFO로 로깅하여 확인
                    log.info("주문 {} 상태: {} (symbol: {})", orderId, status, symbol);
                    
                    // FILLED(완전 체결) 상태인 주문만 처리
                    if ("FILLED".equals(status)) {
                        symbolFilledCount++;
                        totalImported++;
                        
                        // 중복 확인
                        boolean exists = tradeRepository.existsByUserIdAndExchangeTradeId(
                                userId, 
                                orderId
                        );
                        
                        if (!exists) {
                            try {
                                Trade trade = convertOrderToTrade(order, user);
                                Trade savedTrade = tradeRepository.save(trade);
                                
                                if (savedTrade.getId() != null) {
                                    newTrades++;
                                    symbolNewCount++;
                                    log.info("새로운 거래 저장 성공: {} (ID: {})", orderId, savedTrade.getId());
                                } else {
                                    log.warn("거래 저장 실패: {}", orderId);
                                }
                            } catch (Exception e) {
                                log.error("거래 저장 중 오류 - 주문 {}: {}", orderId, e.getMessage());
                            }
                        } else {
                            duplicates++;
                            symbolDuplicateCount++;
                            log.debug("중복 거래 건너뜀: {}", orderId);
                        }
                    } else {
                        // FILLED가 아닌 상태들 로깅
                        log.debug("주문 {} - 상태 {} (건너뜀)", orderId, status);
                    }
                }
                
                log.info("{} 처리 완료: 전체 {}개 중 FILLED {}개 (신규 {}개, 중복 {}개)", 
                         symbol, orders.size(), symbolFilledCount, symbolNewCount, symbolDuplicateCount);
                
            } catch (Exception e) {
                log.error("{} 동기화 실패: {}", symbol, e.getMessage());
                errors.add(String.format("%s: %s", symbol, e.getMessage()));
            }
        }
        
        // 4. 동기화 결과에 따른 적절한 피드백
        if (totalImported == 0 && errors.isEmpty()) {
            log.info("동기화 완료: 체결된 주문이 없습니다. (보류 중인 주문만 있을 수 있음)");
        } else {
            log.info("거래 동기화 완료: userId={}, 총 {}개 중 {}개 추가, {}개 중복", 
                    userId, totalImported, newTrades, duplicates);
        }
        
        // 동기화 성공/실패 처리
        if (errors.isEmpty()) {
            apiKeyService.updateSyncSuccess(userId, "BINANCE");
        } else {
            apiKeyService.incrementSyncFailureCount(userId, "BINANCE");
        }
        
        return TradeSyncResponse.builder()
                .totalProcessed(totalImported)
                .newTrades(newTrades)
                .duplicates(duplicates)
                .errors(errors)
                .syncTime(LocalDateTime.now())
                .message(buildSyncMessage(totalImported, newTrades, duplicates, errors))
                .build();
    }
    
    /**
     * Binance 주문 데이터를 내부 Trade 엔티티로 변환
     */
    private Trade convertOrderToTrade(Map<String, Object> order, User user) {
        // 시간 변환
        Long time = ((Number) order.get("time")).longValue();
        LocalDateTime tradeTime = LocalDateTime.ofInstant(
                Instant.ofEpochMilli(time),
                ZoneId.systemDefault()
        );
        
        // 가격과 수량 추출
        String price = (String) order.get("price");
        String executedQty = (String) order.get("executedQty");
        String cummulativeQuoteQty = (String) order.get("cummulativeQuoteQty");
        
        // 실제 체결 가격 계산 (총 금액 / 수량)
        BigDecimal avgPrice = new BigDecimal(price);
        BigDecimal executedQuantity = new BigDecimal(executedQty);
        BigDecimal quoteQty = new BigDecimal(cummulativeQuoteQty);
        
        if (executedQuantity.compareTo(BigDecimal.ZERO) > 0 && quoteQty.compareTo(BigDecimal.ZERO) > 0) {
            avgPrice = quoteQty.divide(executedQuantity, 8, BigDecimal.ROUND_HALF_UP);
        }
        
        return Trade.builder()
                .user(user)
                .symbol((String) order.get("symbol"))
                .side((String) order.get("side"))
                .entryPrice(avgPrice)
                .entryQuantity(executedQuantity)
                .entryTime(tradeTime)
                .exchange("BINANCE")
                .exchangeTradeId(String.valueOf(order.get("orderId")))
                .quoteQuantity(quoteQty)
                .notes("Binance 주문 자동 동기화")
                .build();
    }
    
    /**
     * 동기화 결과 메시지 생성
     */
    private String buildSyncMessage(int totalImported, int newTrades, int duplicates, List<String> errors) {
        StringBuilder message = new StringBuilder();
        
        if (totalImported == 0 && errors.isEmpty()) {
            message.append("체결된 주문이 없습니다. ");
            message.append("최근 24시간 내 체결된 주문이 없거나, 보류 중인 주문만 있을 수 있습니다.");
        } else if (newTrades > 0) {
            message.append(String.format("%d개의 새로운 거래가 추가되었습니다.", newTrades));
        } else if (duplicates > 0) {
            message.append("모든 거래가 이미 동기화되어 있습니다.");
        }
        
        if (!errors.isEmpty()) {
            message.append(" 일부 심볼에서 오류가 발생했습니다.");
        }
        
        return message.toString();
    }
    
    /**
     * 기본 심볼 목록 반환
     */
    private List<String> getDefaultSymbols() {
        return Arrays.asList("BTCUSDT", "ETHUSDT", "BNBUSDT");
    }
}