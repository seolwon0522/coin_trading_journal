/**
 * 시장 데이터 관련 타입 정의
 * Backend와 통일된 명명 규칙 적용
 */

// 티커 가격 정보
export interface TickerPrice {
  symbol: string; // 심볼 (예: BTCUSDT)
  price: number; // 현재 가격
  priceChangePercent: number; // 24시간 가격 변동률
  volume: number; // 24시간 거래량
  quoteVolume: number; // 24시간 거래대금
  openPrice: number; // 시가
  highPrice: number; // 고가
  lowPrice: number; // 저가
  lastPrice: number; // 종가
  timestamp: Date; // 타임스탬프
}

// 오더북 데이터
export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[]; // 매수 호가
  asks: OrderBookEntry[]; // 매도 호가
  lastUpdateId: number;
  timestamp: Date;
}

// 오더북 엔트리
export interface OrderBookEntry {
  price: number;
  quantity: number;
  total?: number; // 누적 금액
}

// 캔들스틱(봉차트) 데이터
export interface Candlestick {
  symbol: string;
  interval: CandleInterval;
  openTime: Date;
  closeTime: Date;
  open: number; // 시가
  high: number; // 고가
  low: number; // 저가
  close: number; // 종가
  volume: number; // 거래량
  quoteVolume: number; // 거래대금
  trades: number; // 거래 횟수
}

// 캔들 인터벌 타입
export type CandleInterval = 
  | '1m' | '3m' | '5m' | '15m' | '30m' // 분
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' // 시간
  | '1d' | '3d' // 일
  | '1w' // 주
  | '1M'; // 월

// 심볼 정보
export interface SymbolInfo {
  symbol: string;
  baseAsset: string; // 기준 자산 (예: BTC)
  quoteAsset: string; // 견적 자산 (예: USDT)
  status: 'TRADING' | 'HALT' | 'BREAK';
  minQty: number; // 최소 거래 수량
  maxQty: number; // 최대 거래 수량
  stepSize: number; // 거래 수량 단위
  minPrice: number; // 최소 가격
  maxPrice: number; // 최대 가격
  tickSize: number; // 가격 단위
}

// 거래소 정보
export interface ExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: SymbolInfo[];
  rateLimits: RateLimit[];
}

// API 요청 제한 정보
export interface RateLimit {
  rateLimitType: 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';
  interval: 'SECOND' | 'MINUTE' | 'DAY';
  intervalNum: number;
  limit: number;
}

// 24시간 통계
export interface Statistics24hr {
  symbol: string;
  priceChange: number; // 가격 변동
  priceChangePercent: number; // 가격 변동률
  weightedAvgPrice: number; // 가중 평균 가격
  prevClosePrice: number; // 이전 종가
  lastPrice: number; // 현재 가격
  lastQty: number; // 마지막 거래 수량
  bidPrice: number; // 최고 매수 호가
  bidQty: number; // 최고 매수 호가 수량
  askPrice: number; // 최저 매도 호가
  askQty: number; // 최저 매도 호가 수량
  openPrice: number; // 시가
  highPrice: number; // 고가
  lowPrice: number; // 저가
  volume: number; // 거래량
  quoteVolume: number; // 거래대금
  openTime: Date; // 시작 시간
  closeTime: Date; // 종료 시간
  count: number; // 거래 횟수
}

// WebSocket 스트림 데이터 타입
export interface StreamTicker {
  e: string; // 이벤트 타입
  E: number; // 이벤트 시간
  s: string; // 심볼
  p: string; // 가격 변동
  P: string; // 가격 변동률
  w: string; // 가중 평균 가격
  x: string; // 이전 종가
  c: string; // 현재 가격
  Q: string; // 마지막 거래 수량
  b: string; // 최고 매수 호가
  B: string; // 최고 매수 호가 수량
  a: string; // 최저 매도 호가
  A: string; // 최저 매도 호가 수량
  o: string; // 시가
  h: string; // 고가
  l: string; // 저가
  v: string; // 거래량
  q: string; // 거래대금
  O: number; // 통계 시작 시간
  C: number; // 통계 종료 시간
  F: number; // 첫 거래 ID
  L: number; // 마지막 거래 ID
  n: number; // 거래 횟수
}