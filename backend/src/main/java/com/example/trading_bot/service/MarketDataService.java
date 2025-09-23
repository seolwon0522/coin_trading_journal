package com.example.trading_bot.service;

import com.example.trading_bot.dto.TieredMarketData;
import com.example.trading_bot.model.CoinRanking;
import com.example.trading_bot.repository.CoinRankingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.ParameterizedTypeReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketDataService {

    private final CoinRankingRepository coinRankingRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${binance.api.base-url:https://api.binance.com}")
    private String binanceApiUrl;

    private static final int PREMIUM_TIER_SIZE = 20;
    private static final int STANDARD_TIER_SIZE = 100;
    private static final int BATCH_SIZE = 50;

    /**
     * 계층별 마켓 데이터 조회
     */
    @Transactional(readOnly = true)
    public TieredMarketData getTieredMarketData(String quoteAsset) {
        TieredMarketData tieredData = new TieredMarketData();

        // Premium tier (Top 20) - 항상 최신 데이터
        List<CoinRanking> premiumCoins = getPremiumCoins(quoteAsset);
        tieredData.setPremium(premiumCoins);

        // Standard tier (21-100)
        List<CoinRanking> standardCoins = getStandardCoins(quoteAsset);
        tieredData.setStandard(standardCoins);

        // Extended는 검색 시에만 로드
        tieredData.setExtended(new ArrayList<>());

        tieredData.setTotalCount(coinRankingRepository.countActiveCoins());
        tieredData.setLastUpdate(LocalDateTime.now());

        return tieredData;
    }

    /**
     * Premium Tier 코인 조회 (Top 20)
     */
    public List<CoinRanking> getPremiumCoins(String quoteAsset) {
        Pageable pageable = PageRequest.of(0, PREMIUM_TIER_SIZE);

        if (quoteAsset != null && !quoteAsset.isEmpty()) {
            return coinRankingRepository.findByQuoteAsset(quoteAsset, pageable).getContent();
        } else {
            return coinRankingRepository.findTopByVolume(pageable).getContent();
        }
    }

    /**
     * Standard Tier 코인 조회 (21-100)
     */
    public List<CoinRanking> getStandardCoins(String quoteAsset) {
        Pageable pageable = PageRequest.of(1, STANDARD_TIER_SIZE - PREMIUM_TIER_SIZE);

        if (quoteAsset != null && !quoteAsset.isEmpty()) {
            return coinRankingRepository.findByQuoteAsset(quoteAsset, pageable).getContent();
        } else {
            return coinRankingRepository.findTopByVolume(pageable).getContent();
        }
    }

    /**
     * Progressive Loading - 추가 데이터 로드
     */
    public List<CoinRanking> loadMoreCoins(int offset, int limit, String quoteAsset) {
        // DB에서 직접 조회
        return coinRankingRepository.findWithPagination(limit, offset);
    }

    /**
     * 코인 검색
     */
    public List<CoinRanking> searchCoins(String query, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return coinRankingRepository.searchCoins(query, pageable);
    }

    /**
     * Binance API에서 데이터 동기화 (5분마다 실행)
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 10000) // 5분마다
    @Transactional
    public void syncMarketData() {
        log.info("Starting market data sync from Binance...");

        try {
            WebClient webClient = webClientBuilder.baseUrl(binanceApiUrl).build();

            // Binance 24hr ticker 데이터 가져오기
            List<Map<String, Object>> tickers = webClient.get()
                    .uri("/api/v3/ticker/24hr")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();

            if (tickers != null && !tickers.isEmpty()) {
                updateCoinRankings(tickers);
                updateTiers();
                cleanupStaleData();

                log.info("Market data sync completed. Updated {} coins", tickers.size());
            }
        } catch (Exception e) {
            log.error("Failed to sync market data from Binance", e);
        }
    }

    /**
     * 코인 랭킹 데이터 업데이트
     */
    private void updateCoinRankings(List<Map<String, Object>> tickers) {
        // 거래량 기준으로 정렬
        tickers.sort((a, b) -> {
            BigDecimal volumeA = new BigDecimal(a.get("quoteVolume").toString());
            BigDecimal volumeB = new BigDecimal(b.get("quoteVolume").toString());
            return volumeB.compareTo(volumeA);
        });

        int rank = 1;
        List<CoinRanking> rankings = new ArrayList<>();

        for (Map<String, Object> ticker : tickers) {
            try {
                String symbol = ticker.get("symbol").toString();

                // 기존 데이터 조회 또는 새로 생성
                CoinRanking coinRanking = coinRankingRepository.findBySymbol(symbol)
                        .orElse(new CoinRanking());

                // 데이터 업데이트
                coinRanking.setSymbol(symbol);
                coinRanking.setBaseAsset(extractBaseAsset(symbol));
                coinRanking.setQuoteAsset(extractQuoteAsset(symbol));
                coinRanking.setRank(rank++);
                coinRanking.setVolume24h(new BigDecimal(ticker.get("volume").toString()));
                coinRanking.setQuoteVolume24h(new BigDecimal(ticker.get("quoteVolume").toString()));
                coinRanking.setPriceChangePercent24h(new BigDecimal(ticker.get("priceChangePercent").toString()));
                coinRanking.setLastPrice(new BigDecimal(ticker.get("lastPrice").toString()));
                coinRanking.setBidPrice(new BigDecimal(ticker.get("bidPrice").toString()));
                coinRanking.setAskPrice(new BigDecimal(ticker.get("askPrice").toString()));
                coinRanking.setHighPrice24h(new BigDecimal(ticker.get("highPrice").toString()));
                coinRanking.setLowPrice24h(new BigDecimal(ticker.get("lowPrice").toString()));
                coinRanking.setOpenPrice24h(new BigDecimal(ticker.get("openPrice").toString()));
                coinRanking.setPrevClosePrice(new BigDecimal(ticker.get("prevClosePrice").toString()));
                coinRanking.setWeightedAvgPrice(new BigDecimal(ticker.get("weightedAvgPrice").toString()));
                coinRanking.setCount24h(Long.parseLong(ticker.get("count").toString()));
                coinRanking.setIsActive(true);
                coinRanking.setLastUpdateTime(LocalDateTime.now());

                rankings.add(coinRanking);

                // 배치 저장 (성능 최적화)
                if (rankings.size() >= BATCH_SIZE) {
                    coinRankingRepository.saveAll(rankings);
                    rankings.clear();
                }
            } catch (Exception e) {
                log.warn("Failed to process ticker data for symbol: {}", ticker.get("symbol"), e);
            }
        }

        // 남은 데이터 저장
        if (!rankings.isEmpty()) {
            coinRankingRepository.saveAll(rankings);
        }
    }

    /**
     * Tier 업데이트
     */
    private void updateTiers() {
        coinRankingRepository.updateTiersByRank();
    }

    /**
     * 오래된 데이터 정리
     */
    private void cleanupStaleData() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(1);
        coinRankingRepository.deactivateStaleCoins(threshold);
    }

    /**
     * 심볼에서 Base Asset 추출
     */
    private String extractBaseAsset(String symbol) {
        // BTCUSDT -> BTC
        if (symbol.endsWith("USDT")) {
            return symbol.substring(0, symbol.length() - 4);
        } else if (symbol.endsWith("BUSD")) {
            return symbol.substring(0, symbol.length() - 4);
        } else if (symbol.endsWith("BTC")) {
            return symbol.substring(0, symbol.length() - 3);
        } else if (symbol.endsWith("ETH")) {
            return symbol.substring(0, symbol.length() - 3);
        }
        return symbol;
    }

    /**
     * 심볼에서 Quote Asset 추출
     */
    private String extractQuoteAsset(String symbol) {
        // BTCUSDT -> USDT
        if (symbol.endsWith("USDT")) {
            return "USDT";
        } else if (symbol.endsWith("BUSD")) {
            return "BUSD";
        } else if (symbol.endsWith("BTC")) {
            return "BTC";
        } else if (symbol.endsWith("ETH")) {
            return "ETH";
        }
        return "USDT";
    }

    /**
     * 특정 심볼들의 실시간 데이터만 조회 (WebSocket 대체용)
     */
    public List<CoinRanking> getRealtimeData(List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return new ArrayList<>();
        }

        // DB에서 직접 조회
        return coinRankingRepository.findBySymbolIn(symbols);
    }
}