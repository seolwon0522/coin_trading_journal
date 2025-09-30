package com.example.trading_bot.redis;

import com.example.trading_bot.auth.entity.ProviderType;
import com.example.trading_bot.auth.entity.Role;
import com.example.trading_bot.auth.entity.User;
import com.example.trading_bot.auth.repository.UserRepository;
import com.example.trading_bot.portfolio.entity.Portfolio;
import com.example.trading_bot.portfolio.repository.PortfolioRepository;
import com.example.trading_bot.strategy.entity.Strategy;
import com.example.trading_bot.strategy.entity.StrategyType;
import com.example.trading_bot.strategy.repository.StrategyRepository;
import com.example.trading_bot.trade.entity.Trade;
import com.example.trading_bot.trade.repository.TradeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Nautilus Event Persister 통합 테스트
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NautilusEventPersisterTest {

    @Autowired
    private NautilusEventPersister eventPersister;

    @Autowired
    private TradeRepository tradeRepository;

    @Autowired
    private StrategyRepository strategyRepository;

    @Autowired
    private PortfolioRepository portfolioRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private Strategy testStrategy;

    @BeforeEach
    void setUp() {
        // 테스트 사용자 생성
        testUser = User.builder()
            .email("test@example.com")
            .name("Test User")
            .password("password")
            .providerType(ProviderType.LOCAL)
            .role(Role.USER)
            .isActive(true)
            .build();
        testUser = userRepository.save(testUser);

        // 테스트 전략 생성
        testStrategy = Strategy.builder()
            .user(testUser)
            .name("Test EMA Strategy")
            .type(StrategyType.EMA_CROSS)
            .symbol("BTCUSDT")
            .params(new HashMap<>())
            .active(false)
            .testnet(true)
            .nautilusStrategyId("TEST_STRATEGY_001")
            .build();
        testStrategy = strategyRepository.save(testStrategy);
    }

    @Test
    void persistTradeEvent_성공() {
        // Given: Nautilus Trade 이벤트 데이터
        Map<String, Object> eventData = createTradeEventData(
            "BTCUSDT",
            "BUY",
            "50000",
            "0.1",
            "ORDER_001"
        );

        // When: 이벤트 저장
        eventPersister.persistTradeEvent(eventData);

        // Then: Trade가 DB에 저장되었는지 확인
        Optional<Trade> savedTrade = tradeRepository.findByUserIdAndExchangeTradeId(
            testUser.getId(), "ORDER_001"
        ).stream().findFirst();

        assertThat(savedTrade).isPresent();
        assertThat(savedTrade.get().getSymbol()).isEqualTo("BTCUSDT");
        assertThat(savedTrade.get().getSide()).isEqualTo("BUY");
        assertThat(savedTrade.get().getEntryPrice()).isEqualByComparingTo(new BigDecimal("50000"));
        assertThat(savedTrade.get().getEntryQuantity()).isEqualByComparingTo(new BigDecimal("0.1"));
        assertThat(savedTrade.get().getExchange()).isEqualTo("NAUTILUS");
    }

    @Test
    void persistTradeEvent_Portfolio자동업데이트() {
        // Given: Trade 이벤트
        Map<String, Object> eventData = createTradeEventData(
            "BTCUSDT",
            "BUY",
            "50000",
            "0.5",
            "ORDER_002"
        );

        // When: 이벤트 저장
        eventPersister.persistTradeEvent(eventData);

        // Then: Portfolio가 업데이트되었는지 확인
        Optional<Portfolio> portfolio = portfolioRepository.findByUserIdAndSymbol(
            testUser.getId(), "BTCUSDT"
        );

        assertThat(portfolio).isPresent();
        assertThat(portfolio.get().getQuantity()).isEqualByComparingTo(new BigDecimal("0.5"));
        assertThat(portfolio.get().getAvgBuyPrice()).isEqualByComparingTo(new BigDecimal("50000"));
        assertThat(portfolio.get().getTotalInvested()).isEqualByComparingTo(new BigDecimal("25000"));
    }

    @Test
    void persistTradeEvent_중복방지() {
        // Given: 동일한 Order ID를 가진 이벤트
        Map<String, Object> eventData = createTradeEventData(
            "ETHUSDT",
            "BUY",
            "3000",
            "1.0",
            "ORDER_003"
        );

        // When: 같은 이벤트를 두 번 저장
        eventPersister.persistTradeEvent(eventData);
        eventPersister.persistTradeEvent(eventData);

        // Then: Trade가 한 번만 저장되었는지 확인
        long count = tradeRepository.findByUserIdAndExchangeTradeId(testUser.getId(), "ORDER_003")
            .stream()
            .count();

        assertThat(count).isEqualTo(1);
    }

    @Test
    void persistPositionEvent_미실현손익업데이트() {
        // Given: Portfolio 생성
        Portfolio portfolio = Portfolio.builder()
            .user(testUser)
            .symbol("BTCUSDT")
            .asset("BTC")
            .quantity(new BigDecimal("0.5"))
            .free(new BigDecimal("0.5"))
            .locked(BigDecimal.ZERO)
            .avgBuyPrice(new BigDecimal("50000"))
            .totalInvested(new BigDecimal("25000"))
            .currentPrice(new BigDecimal("51000"))
            .currentValue(new BigDecimal("25500"))
            .isManualEntry(false)
            .build();
        portfolio = portfolioRepository.save(portfolio);

        // Position 이벤트 데이터
        Map<String, Object> positionData = createPositionEventData(
            "BTCUSDT",
            "0.5",
            "52000",
            "1000"  // 미실현 손익 $1000
        );

        // When: Position 이벤트 저장
        eventPersister.persistPositionEvent(positionData);

        // Then: Portfolio의 미실현 손익이 업데이트되었는지 확인
        Portfolio updated = portfolioRepository.findById(portfolio.getId()).orElseThrow();
        assertThat(updated.getUnrealizedPnl()).isEqualByComparingTo(new BigDecimal("1000"));
        assertThat(updated.getCurrentPrice()).isEqualByComparingTo(new BigDecimal("52000"));
    }

    // ==================== Helper Methods ====================

    private Map<String, Object> createTradeEventData(
        String symbol, String side, String price, String quantity, String orderId
    ) {
        Map<String, Object> data = new HashMap<>();
        data.put("symbol", symbol);
        data.put("side", side);
        data.put("price", price);
        data.put("filled_qty", quantity);
        data.put("order_id", orderId);
        data.put("commission", "0.001");
        data.put("commission_asset", "USDT");
        data.put("timestamp", System.currentTimeMillis());

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("strategy_id", testStrategy.getNautilusStrategyId());

        Map<String, Object> eventData = new HashMap<>();
        eventData.put("data", data);
        eventData.put("metadata", metadata);

        return eventData;
    }

    private Map<String, Object> createPositionEventData(
        String symbol, String quantity, String currentPrice, String unrealizedPnl
    ) {
        Map<String, Object> data = new HashMap<>();
        data.put("symbol", symbol);
        data.put("quantity", quantity);
        data.put("current_price", currentPrice);
        data.put("unrealized_pnl", unrealizedPnl);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("strategy_id", testStrategy.getNautilusStrategyId());

        Map<String, Object> eventData = new HashMap<>();
        eventData.put("data", data);
        eventData.put("metadata", metadata);

        return eventData;
    }
}
