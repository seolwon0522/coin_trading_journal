import { apiClient } from '@/lib/axios';

// 코인 가격 정보 타입 정의
export interface CoinPriceData {
  time: {
    updated: string;
    updatedISO: string;
    updateduk: string;
  };
  disclaimer: string;
  bpi: {
    USD: {
      code: string;
      symbol: string;
      rate: string;
      description: string;
      rate_float: number;
    };
    GBP: {
      code: string;
      symbol: string;
      rate: string;
      description: string;
      rate_float: number;
    };
    EUR: {
      code: string;
      symbol: string;
      rate: string;
      description: string;
      rate_float: number;
    };
  };
}

// 바이낸스 API 관련 타입 정의
export interface BinanceTickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface BinanceExchangeInfo {
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    baseAssetPrecision: number;
    quoteAsset: string;
    quotePrecision: number;
    quoteAssetPrecision: number;
    orderTypes: string[];
    icebergAllowed: boolean;
    ocoAllowed: boolean;
    isSpotTradingAllowed: boolean;
    isMarginTradingAllowed: boolean;
    filters: unknown[];
    permissions: string[];
  }>;
}

// API 호출 함수들
export const coinApi = {
  // 비트코인 현재 가격 정보 가져오기
  getCurrentPrice: async (): Promise<CoinPriceData> => {
    try {
      const response = await apiClient.get<CoinPriceData>('/bpi/currentprice.json');
      return response.data;
    } catch (error) {
      console.error('비트코인 가격 정보를 가져오는데 실패했습니다:', error);
      throw new Error('비트코인 가격 정보를 가져오는데 실패했습니다');
    }
  },

  // 특정 날짜의 비트코인 가격 정보 가져오기 (예제용)
  getHistoricalPrice: async (date: string): Promise<CoinPriceData> => {
    try {
      const response = await apiClient.get<CoinPriceData>(
        `/bpi/historical/close.json?start=${date}&end=${date}`
      );
      return response.data;
    } catch (error) {
      console.error('과거 비트코인 가격 정보를 가져오는데 실패했습니다:', error);
      throw new Error('과거 비트코인 가격 정보를 가져오는데 실패했습니다');
    }
  },
};

// 바이낸스 API 함수들
export const binanceApi = {
  // 바이낸스 거래소 정보 가져오기 (사용 가능한 코인 목록)
  getExchangeInfo: async (): Promise<BinanceExchangeInfo> => {
    try {
      const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('바이낸스 거래소 정보를 가져오는데 실패했습니다:', error);
      throw new Error('바이낸스 거래소 정보를 가져오는데 실패했습니다');
    }
  },

  // 특정 코인의 현재 가격 정보 가져오기
  getTickerPrice: async (symbol: string): Promise<BinanceTickerData> => {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`${symbol} 가격 정보를 가져오는데 실패했습니다:`, error);
      throw new Error(`${symbol} 가격 정보를 가져오는데 실패했습니다`);
    }
  },

  // 모든 코인의 현재 가격 정보 가져오기
  getAllTickerPrices: async (): Promise<BinanceTickerData[]> => {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('모든 코인 가격 정보를 가져오는데 실패했습니다:', error);
      throw new Error('모든 코인 가격 정보를 가져오는데 실패했습니다');
    }
  },
};
