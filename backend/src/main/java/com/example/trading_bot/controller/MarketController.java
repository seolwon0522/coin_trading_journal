package com.example.trading_bot.controller;

import com.example.trading_bot.dto.MarketDataResponse;
import com.example.trading_bot.dto.TieredMarketData;
import com.example.trading_bot.model.CoinRanking;
import com.example.trading_bot.service.MarketDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/markets")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Market Data", description = "계층적 마켓 데이터 API")
public class MarketController {

    private final MarketDataService marketDataService;

    /**
     * 계층별 마켓 데이터 조회 (최적화된 엔드포인트)
     */
    @GetMapping("/tiered")
    @Operation(summary = "계층별 마켓 데이터 조회", description = "Premium, Standard, Extended 계층으로 구분된 마켓 데이터 조회")
    public ResponseEntity<TieredMarketData> getTieredMarketData(
            @Parameter(description = "Quote asset (USDT, BTC, BUSD)") @RequestParam(required = false) String quoteAsset) {

        long startTime = System.currentTimeMillis();

        TieredMarketData data = marketDataService.getTieredMarketData(quoteAsset);
        data.setLoadTime(System.currentTimeMillis() - startTime);
        data.setQuoteAsset(quoteAsset);

        log.debug("Tiered market data loaded in {}ms", data.getLoadTime());
        return ResponseEntity.ok(data);
    }

    /**
     * Premium 코인만 조회 (Top 20)
     */
    @GetMapping("/premium")
    @Operation(summary = "Premium 코인 조회", description = "거래량 상위 20개 코인 조회")
    public ResponseEntity<List<MarketDataResponse>> getPremiumCoins(
            @RequestParam(required = false) String quoteAsset) {

        List<CoinRanking> coins = marketDataService.getPremiumCoins(quoteAsset);
        List<MarketDataResponse> response = coins.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Progressive Loading - 추가 데이터 로드
     */
    @GetMapping("/load-more")
    @Operation(summary = "추가 코인 데이터 로드", description = "스크롤 시 추가 코인 데이터를 점진적으로 로드")
    public ResponseEntity<List<MarketDataResponse>> loadMore(
            @Parameter(description = "시작 위치") @RequestParam(defaultValue = "100") int offset,
            @Parameter(description = "로드할 개수") @RequestParam(defaultValue = "50") int limit,
            @Parameter(description = "Quote asset") @RequestParam(required = false) String quoteAsset) {

        if (limit > 200) {
            limit = 200; // 최대 제한
        }

        List<CoinRanking> coins = marketDataService.loadMoreCoins(offset, limit, quoteAsset);
        List<MarketDataResponse> response = coins.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * 코인 검색
     */
    @GetMapping("/search")
    @Operation(summary = "코인 검색", description = "심볼 또는 이름으로 코인 검색")
    public ResponseEntity<List<MarketDataResponse>> searchCoins(
            @Parameter(description = "검색어", required = true) @RequestParam String query,
            @Parameter(description = "최대 결과 수") @RequestParam(defaultValue = "20") int limit) {

        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<CoinRanking> coins = marketDataService.searchCoins(query.trim(), limit);
        List<MarketDataResponse> response = coins.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * 특정 심볼들의 실시간 데이터 조회 (WebSocket 대체)
     */
    @PostMapping("/realtime")
    @Operation(summary = "실시간 데이터 조회", description = "특정 심볼들의 최신 데이터 조회")
    public ResponseEntity<List<MarketDataResponse>> getRealtimeData(
            @RequestBody List<String> symbols) {

        if (symbols == null || symbols.isEmpty() || symbols.size() > 100) {
            return ResponseEntity.badRequest().build();
        }

        List<CoinRanking> coins = marketDataService.getRealtimeData(symbols);
        List<MarketDataResponse> response = coins.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * 데이터 동기화 트리거 (관리자용)
     */
    @PostMapping("/sync")
    @Operation(summary = "데이터 동기화", description = "Binance API에서 최신 데이터 동기화 (관리자용)")
    public ResponseEntity<String> syncData() {
        try {
            marketDataService.syncMarketData();
            return ResponseEntity.ok("Data sync triggered successfully");
        } catch (Exception e) {
            log.error("Failed to trigger data sync", e);
            return ResponseEntity.internalServerError().body("Failed to trigger data sync");
        }
    }

    /**
     * CoinRanking을 MarketDataResponse로 변환
     */
    private MarketDataResponse convertToResponse(CoinRanking coin) {
        return MarketDataResponse.builder()
                .symbol(coin.getSymbol())
                .baseAsset(coin.getBaseAsset())
                .quoteAsset(coin.getQuoteAsset())
                .rank(coin.getRank())
                .price(coin.getLastPrice())
                .volume24h(coin.getVolume24h())
                .quoteVolume24h(coin.getQuoteVolume24h())
                .priceChangePercent24h(coin.getPriceChangePercent24h())
                .highPrice24h(coin.getHighPrice24h())
                .lowPrice24h(coin.getLowPrice24h())
                .tier(coin.getTier())
                .lastUpdate(coin.getLastUpdateTime())
                .build();
    }
}