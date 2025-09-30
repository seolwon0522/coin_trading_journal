package com.example.trading_bot.redis;

import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.portfolio.entity.Portfolio;
import com.example.trading_bot.portfolio.repository.PortfolioRepository;
import com.example.trading_bot.strategy.entity.Strategy;
import com.example.trading_bot.strategy.repository.StrategyRepository;
import com.example.trading_bot.trade.entity.Trade;
import com.example.trading_bot.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Nautilus 이벤트를 데이터베이스에 영속화하는 서비스
 * 
 * Redis Pub/Sub를 통해 수신한 Nautilus 이벤트를 파싱하여
 * Trade, Position 등을 DB에 저장하고 Portfolio를 업데이트합니다.
 * 
 * @author Trading Bot Team
 * @since 2025-09-30
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NautilusEventPersister {

    private final TradeRepository tradeRepository;
    private final StrategyRepository strategyRepository;
    private final PortfolioRepository portfolioRepository;

    /**
     * Nautilus 거래 이벤트를 Trade 엔티티로 저장
     * 
     * @param eventData Redis에서 수신한 이벤트 데이터
     */
    @Transactional
    public void persistTradeEvent(Map<String, Object> eventData) {
        try {
            // 1. Strategy ID 추출
            String nautilusStrategyId = extractStrategyId(eventData);
            if (nautilusStrategyId == null) {
                log.warn("Strategy ID not found in trade event");
                return;
            }

            // 2. Strategy 조회
            Optional<Strategy> strategyOpt = strategyRepository.findByNautilusStrategyId(nautilusStrategyId);
            if (strategyOpt.isEmpty()) {
                log.warn("Strategy not found for nautilusId: {}", nautilusStrategyId);
                return;
            }

            Strategy strategy = strategyOpt.get();
            User user = strategy.getUser();

            // 3. 이벤트 데이터 파싱
            Map<String, Object> data = extractData(eventData);
            if (data == null) {
                log.warn("No data field in trade event");
                return;
            }

            // 4. Trade 엔티티 생성
            Trade trade = buildTradeFromEvent(user, strategy, data, eventData);

            // 5. 중복 체크 (같은 Nautilus Order ID가 있으면 업데이트)
            String nautilusOrderId = getString(data, "order_id");
            if (nautilusOrderId != null && tradeRepository.existsByUserIdAndExchangeTradeId(user.getId(), nautilusOrderId)) {
                log.debug("Trade already exists for orderId: {}, skipping", nautilusOrderId);
                return;
            }

            // 6. 새 Trade 저장
            Trade savedTrade = tradeRepository.save(trade);

            log.info("Persisted trade from Nautilus: tradeId={}, strategyId={}, symbol={}, side={}, qty={}, price={}",
                savedTrade.getId(),
                nautilusStrategyId,
                savedTrade.getSymbol(),
                savedTrade.getSide(),
                savedTrade.getEntryQuantity(),
                savedTrade.getEntryPrice());

            // 7. Portfolio 업데이트
            updatePortfolioFromTrade(user, savedTrade);

        } catch (Exception e) {
            log.error("Failed to persist trade event", e);
            // 에러 발생 시에도 다른 이벤트 처리는 계속되도록 예외를 삼킴
        }
    }

    /**
     * Nautilus 포지션 이벤트를 처리
     *
     * @param eventData Redis에서 수신한 이벤트 데이터
     */
    @Transactional
    public void persistPositionEvent(Map<String, Object> eventData) {
        try {
            String nautilusStrategyId = extractStrategyId(eventData);
            if (nautilusStrategyId == null) {
                return;
            }

            Map<String, Object> data = extractData(eventData);
            if (data == null) {
                return;
            }

            // Position 정보로 Portfolio 업데이트
            Optional<Strategy> strategyOpt = strategyRepository.findByNautilusStrategyId(nautilusStrategyId);
            if (strategyOpt.isEmpty()) {
                return;
            }

            Strategy strategy = strategyOpt.get();
            updatePortfolioFromPosition(strategy.getUser(), data);

            log.debug("Processed position event: strategyId={}, symbol={}",
                nautilusStrategyId, data.get("symbol"));

        } catch (Exception e) {
            log.error("Failed to persist position event", e);
        }
    }

    /**
     * Nautilus 주문 이벤트를 처리
     * 주문 정보는 WebSocket으로 전송하고, 체결된 주문은 Trade로 저장
     *
     * @param eventData Redis에서 수신한 이벤트 데이터
     */
    @Transactional
    public void persistOrderEvent(Map<String, Object> eventData) {
        try {
            String nautilusStrategyId = extractStrategyId(eventData);
            if (nautilusStrategyId == null) {
                return;
            }

            Map<String, Object> data = extractData(eventData);
            if (data == null) {
                return;
            }

            // Strategy 조회
            Optional<Strategy> strategyOpt = strategyRepository.findByNautilusStrategyId(nautilusStrategyId);
            if (strategyOpt.isEmpty()) {
                return;
            }

            Strategy strategy = strategyOpt.get();
            User user = strategy.getUser();

            // 주문 상태 확인
            String orderStatus = getString(data, "status");

            // FILLED 주문은 Trade로 저장
            if ("FILLED".equalsIgnoreCase(orderStatus)) {
                persistFilledOrderAsTrade(user, strategy, data);
            }

            log.debug("Processed order event: strategyId={}, orderId={}, status={}",
                nautilusStrategyId, data.get("order_id"), orderStatus);

        } catch (Exception e) {
            log.error("Failed to persist order event", e);
        }
    }

    /**
     * 체결된 주문을 Trade로 저장
     */
    private void persistFilledOrderAsTrade(User user, Strategy strategy, Map<String, Object> data) {
        String orderId = getString(data, "order_id");

        // 중복 체크
        if (orderId != null && tradeRepository.existsByUserIdAndExchangeTradeId(user.getId(), orderId)) {
            log.debug("Trade already exists for orderId: {}", orderId);
            return;
        }

        // Trade 생성 및 저장
        Trade trade = buildTradeFromOrderData(user, strategy, data);
        Trade savedTrade = tradeRepository.save(trade);

        log.info("Persisted filled order as trade: tradeId={}, orderId={}, symbol={}",
            savedTrade.getId(), orderId, savedTrade.getSymbol());

        // Portfolio 업데이트
        updatePortfolioFromTrade(user, savedTrade);
    }

    /**
     * Order 데이터로부터 Trade 엔티티 생성
     */
    private Trade buildTradeFromOrderData(User user, Strategy strategy, Map<String, Object> data) {
        String symbol = getString(data, "symbol");
        String side = getString(data, "side");

        // 가격 및 수량
        BigDecimal avgFillPrice = getBigDecimal(data, "avg_fill_price");
        BigDecimal filledQty = getBigDecimal(data, "filled_quantity");

        // 수수료
        BigDecimal commission = getBigDecimal(data, "commission");

        // 시간
        LocalDateTime tradeTime = parseTimestamp(data, "timestamp");
        if (tradeTime == null) {
            tradeTime = LocalDateTime.now();
        }

        // Order ID
        String orderId = getString(data, "order_id");

        return Trade.builder()
            .user(user)
            .symbol(symbol)
            .side(side != null ? side.toUpperCase() : "BUY")
            .entryPrice(avgFillPrice != null ? avgFillPrice : BigDecimal.ZERO)
            .entryQuantity(filledQty != null ? filledQty : BigDecimal.ZERO)
            .entryTime(tradeTime)
            .exchange("NAUTILUS")
            .exchangeTradeId(orderId)
            .commission(commission)
            .isMaker(false)
            .build();
    }

    // ==================== Helper Methods ====================

    /**
     * 이벤트 데이터에서 Trade 엔티티 생성
     */
    private Trade buildTradeFromEvent(User user, Strategy strategy, Map<String, Object> data, Map<String, Object> eventData) {
        String symbol = getString(data, "symbol");
        String side = getString(data, "side");
        
        // 가격 및 수량
        BigDecimal price = getBigDecimal(data, "price");
        BigDecimal quantity = getBigDecimal(data, "filled_qty");
        if (quantity == null) {
            quantity = getBigDecimal(data, "quantity");
        }

        // 수수료
        BigDecimal commission = getBigDecimal(data, "commission");
        String commissionAsset = getString(data, "commission_asset");

        // 실현 손익
        BigDecimal realizedPnl = getBigDecimal(data, "realized_pnl");

        // 시간
        LocalDateTime tradeTime = parseTimestamp(data, "timestamp");
        if (tradeTime == null) {
            tradeTime = LocalDateTime.now();
        }

        // Nautilus Order ID
        String orderId = getString(data, "order_id");

        return Trade.builder()
            .user(user)
            .symbol(symbol)
            .side(side != null ? side.toUpperCase() : "BUY")
            .entryPrice(price != null ? price : BigDecimal.ZERO)
            .entryQuantity(quantity != null ? quantity : BigDecimal.ZERO)
            .entryTime(tradeTime)
            .exchange("NAUTILUS")
            .exchangeTradeId(orderId)
            .commission(commission)
            .commissionAsset(commissionAsset)
            .realizedPnl(realizedPnl)
            .isMaker(false) // Nautilus에서 제공하지 않으면 기본값
            .build();
    }

    /**
     * Trade 정보로 Portfolio 업데이트
     */
    private void updatePortfolioFromTrade(User user, Trade trade) {
        String symbol = trade.getSymbol();
        if (symbol == null) {
            return;
        }

        // Portfolio 조회 또는 생성
        Portfolio portfolio = portfolioRepository
            .findByUserIdAndSymbol(user.getId(), symbol)
            .orElseGet(() -> createNewPortfolio(user, symbol));

        // 수량 업데이트
        BigDecimal currentQty = portfolio.getQuantity() != null ? portfolio.getQuantity() : BigDecimal.ZERO;
        BigDecimal tradeQty = trade.getEntryQuantity();

        if ("BUY".equalsIgnoreCase(trade.getSide())) {
            portfolio.setQuantity(currentQty.add(tradeQty));
            
            // 평균 매수가 계산
            BigDecimal currentInvested = portfolio.getTotalInvested() != null ? 
                portfolio.getTotalInvested() : BigDecimal.ZERO;
            BigDecimal tradeValue = trade.getEntryPrice().multiply(tradeQty);
            BigDecimal newInvested = currentInvested.add(tradeValue);
            
            portfolio.setTotalInvested(newInvested);
            
            if (portfolio.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal avgBuyPrice = newInvested.divide(portfolio.getQuantity(), 8, RoundingMode.HALF_UP);
                portfolio.setAvgBuyPrice(avgBuyPrice);
            }
        } else if ("SELL".equalsIgnoreCase(trade.getSide())) {
            portfolio.setQuantity(currentQty.subtract(tradeQty));
            
            // 매도 시 투자금 비례 감소
            if (portfolio.getTotalInvested() != null && currentQty.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal sellRatio = tradeQty.divide(currentQty, 8, RoundingMode.HALF_UP);
                BigDecimal reducedInvested = portfolio.getTotalInvested().multiply(sellRatio);
                portfolio.setTotalInvested(portfolio.getTotalInvested().subtract(reducedInvested));
            }
        }

        portfolio.setLastBalanceUpdate(LocalDateTime.now());
        portfolioRepository.save(portfolio);

        log.debug("Updated portfolio from trade: symbol={}, qty={}", symbol, portfolio.getQuantity());
    }

    /**
     * Position 정보로 Portfolio 업데이트
     */
    private void updatePortfolioFromPosition(User user, Map<String, Object> data) {
        String symbol = getString(data, "symbol");
        if (symbol == null) {
            return;
        }

        Portfolio portfolio = portfolioRepository
            .findByUserIdAndSymbol(user.getId(), symbol)
            .orElseGet(() -> createNewPortfolio(user, symbol));

        // 미실현 손익 업데이트
        BigDecimal unrealizedPnl = getBigDecimal(data, "unrealized_pnl");
        if (unrealizedPnl != null) {
            portfolio.setUnrealizedPnl(unrealizedPnl);
            
            // 퍼센트 계산
            if (portfolio.getTotalInvested() != null && 
                portfolio.getTotalInvested().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal pnlPercent = unrealizedPnl
                    .divide(portfolio.getTotalInvested(), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
                portfolio.setUnrealizedPnlPercent(pnlPercent);
            }
        }

        // 현재 가격
        BigDecimal currentPrice = getBigDecimal(data, "current_price");
        if (currentPrice != null) {
            portfolio.setCurrentPrice(currentPrice);
            portfolio.setLastPriceUpdate(LocalDateTime.now());
        }

        // 수량
        BigDecimal quantity = getBigDecimal(data, "quantity");
        if (quantity != null) {
            portfolio.setQuantity(quantity);
        }

        portfolioRepository.save(portfolio);
    }

    /**
     * 새 Portfolio 생성
     */
    private Portfolio createNewPortfolio(User user, String symbol) {
        return Portfolio.builder()
            .user(user)
            .symbol(symbol)
            .asset(symbol.replace("USDT", ""))
            .quantity(BigDecimal.ZERO)
            .free(BigDecimal.ZERO)
            .locked(BigDecimal.ZERO)
            .currentPrice(BigDecimal.ZERO)
            .currentValue(BigDecimal.ZERO)
            .firstBuyDate(LocalDateTime.now())
            .lastBalanceUpdate(LocalDateTime.now())
            .isManualEntry(false)
            .build();
    }

    /**
     * 이벤트에서 Strategy ID 추출
     */
    private String extractStrategyId(Map<String, Object> eventData) {
        // metadata.strategy_id 확인
        Object metadata = eventData.get("metadata");
        if (metadata instanceof Map) {
            Object strategyId = ((Map<?, ?>) metadata).get("strategy_id");
            if (strategyId != null) {
                return strategyId.toString();
            }
        }

        // data.strategy_id 확인
        Object data = eventData.get("data");
        if (data instanceof Map) {
            Object strategyId = ((Map<?, ?>) data).get("strategy_id");
            if (strategyId != null) {
                return strategyId.toString();
            }
        }

        return null;
    }

    /**
     * 이벤트에서 data 필드 추출
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> extractData(Map<String, Object> eventData) {
        Object data = eventData.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        return null;
    }

    /**
     * Map에서 String 값 추출
     */
    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }

    /**
     * Map에서 BigDecimal 값 추출
     */
    private BigDecimal getBigDecimal(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return new BigDecimal(value.toString());
        }
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Failed to parse BigDecimal for key {}: {}", key, value);
            return null;
        }
    }

    /**
     * 타임스탬프 파싱
     */
    private LocalDateTime parseTimestamp(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value == null) {
            return null;
        }

        try {
            // ISO 8601 형식 시도
            if (value.toString().contains("T")) {
                return ZonedDateTime.parse(value.toString()).toLocalDateTime();
            }
            // Unix timestamp (밀리초) 시도
            long timestamp = Long.parseLong(value.toString());
            return LocalDateTime.ofEpochSecond(timestamp / 1000, 0, java.time.ZoneOffset.UTC);
        } catch (Exception e) {
            log.warn("Failed to parse timestamp for key {}: {}", key, value);
            return null;
        }
    }
}
