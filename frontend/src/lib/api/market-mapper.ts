/**
 * Market Data 매핑 유틸리티
 * Binance API 응답과 Frontend 타입 간의 변환
 */

import { TickerPrice, OrderBook, Candlestick, Statistics24hr, StreamTicker } from '@/types/market';

/**
 * Binance API ticker 응답을 TickerPrice로 변환
 */
export function mapBinanceTickerToPrice(ticker: any): TickerPrice {
  return {
    symbol: ticker.symbol,
    price: parseFloat(ticker.price || ticker.lastPrice),
    priceChangePercent: parseFloat(ticker.priceChangePercent || '0'),
    volume: parseFloat(ticker.volume || '0'),
    quoteVolume: parseFloat(ticker.quoteVolume || '0'),
    openPrice: parseFloat(ticker.openPrice || '0'),
    highPrice: parseFloat(ticker.highPrice || '0'),
    lowPrice: parseFloat(ticker.lowPrice || '0'),
    lastPrice: parseFloat(ticker.lastPrice || ticker.price),
    timestamp: new Date(),
  };
}

/**
 * Binance API 24hr 통계를 Statistics24hr로 변환
 */
export function mapBinance24hrStats(stats: any): Statistics24hr {
  return {
    symbol: stats.symbol,
    priceChange: parseFloat(stats.priceChange),
    priceChangePercent: parseFloat(stats.priceChangePercent),
    weightedAvgPrice: parseFloat(stats.weightedAvgPrice),
    prevClosePrice: parseFloat(stats.prevClosePrice),
    lastPrice: parseFloat(stats.lastPrice),
    lastQty: parseFloat(stats.lastQty),
    bidPrice: parseFloat(stats.bidPrice),
    bidQty: parseFloat(stats.bidQty),
    askPrice: parseFloat(stats.askPrice),
    askQty: parseFloat(stats.askQty),
    openPrice: parseFloat(stats.openPrice),
    highPrice: parseFloat(stats.highPrice),
    lowPrice: parseFloat(stats.lowPrice),
    volume: parseFloat(stats.volume),
    quoteVolume: parseFloat(stats.quoteVolume),
    openTime: new Date(stats.openTime),
    closeTime: new Date(stats.closeTime),
    count: stats.count,
  };
}

/**
 * Binance Kline 데이터를 Candlestick으로 변환
 */
export function mapBinanceKlineToCandlestick(kline: any[], symbol: string, interval: string): Candlestick {
  return {
    symbol,
    interval: interval as any,
    openTime: new Date(kline[0]),
    closeTime: new Date(kline[6]),
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5]),
    quoteVolume: parseFloat(kline[7]),
    trades: kline[8],
  };
}

/**
 * Binance OrderBook 데이터 변환
 */
export function mapBinanceOrderBook(data: any, symbol: string): OrderBook {
  return {
    symbol,
    bids: data.bids.map((bid: any[]) => ({
      price: parseFloat(bid[0]),
      quantity: parseFloat(bid[1]),
    })),
    asks: data.asks.map((ask: any[]) => ({
      price: parseFloat(ask[0]),
      quantity: parseFloat(ask[1]),
    })),
    lastUpdateId: data.lastUpdateId,
    timestamp: new Date(),
  };
}

/**
 * WebSocket 스트림 티커 데이터 변환
 */
export function mapStreamTickerToPrice(stream: StreamTicker): TickerPrice {
  return {
    symbol: stream.s,
    price: parseFloat(stream.c),
    priceChangePercent: parseFloat(stream.P),
    volume: parseFloat(stream.v),
    quoteVolume: parseFloat(stream.q),
    openPrice: parseFloat(stream.o),
    highPrice: parseFloat(stream.h),
    lowPrice: parseFloat(stream.l),
    lastPrice: parseFloat(stream.c),
    timestamp: new Date(stream.E),
  };
}

/**
 * 심볼 정규화 (대문자 변환)
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * 가격 포맷팅 (소수점 처리)
 */
export function formatPrice(price: number, decimals: number = 2): string {
  if (price < 0.01) {
    return price.toFixed(8);
  } else if (price < 1) {
    return price.toFixed(4);
  } else if (price < 1000) {
    return price.toFixed(decimals);
  } else {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}

/**
 * 변동률 포맷팅
 */
export function formatPercentage(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * 거래량 포맷팅 (축약형)
 */
export function formatVolume(volume: number): string {
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(2)}B`;
  } else if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(2)}M`;
  } else if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(2)}K`;
  }
  return volume.toFixed(2);
}