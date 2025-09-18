export interface SymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  baseAssetPrecision: number;
  quoteAssetPrecision: number;
  orderTypes: string[];
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
}

export interface Ticker24hr {
  symbol: string;
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

// 마켓 아이템 검색 결과 인터페이스
export interface MarketSearchResult {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  count?: number;
}

// 심볼 검색 함수 - 검색어와 일치하는 심볼 필터링
export async function searchSymbols(query: string, limit: number = 10000): Promise<MarketSearchResult[]> {
  try {
    const response = await fetch('/api/binance/ticker');
    if (!response.ok) {
      throw new Error('Failed to fetch tickers');
    }

    const tickers: Ticker24hr[] = await response.json();

    // 검색어로 필터링
    const filtered = tickers.filter(ticker => {
      const searchTerm = query.toUpperCase();
      const symbol = ticker.symbol.toUpperCase();
      const baseAsset = symbol.replace(/USDT|BUSD|BTC|ETH|BNB/, '');

      return symbol.includes(searchTerm) ||
             baseAsset.includes(searchTerm);
    });

    // 거래량 순으로 정렬 후 limit만큼 반환
    // limit가 10000이면 사실상 모든 코인을 반환
    return filtered
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, limit)
      .map(ticker => ({
        symbol: ticker.symbol,
        lastPrice: ticker.lastPrice,
        priceChangePercent: ticker.priceChangePercent,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume,
        count: ticker.count
      }));
  } catch (error) {
    console.error('Error searching symbols:', error);
    return [];
  }
}

export class BinanceApi {
  private baseUrl = '/api/binance';

  async getExchangeInfo(): Promise<{ symbols: SymbolInfo[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/exchangeInfo`);
      if (!response.ok) {
        throw new Error('Failed to fetch exchange info');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching exchange info:', error);
      throw error;
    }
  }

  async get24hrTickers(): Promise<Ticker24hr[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ticker`);
      if (!response.ok) {
        throw new Error('Failed to fetch 24hr tickers');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching 24hr tickers:', error);
      throw error;
    }
  }

  async get24hrTicker(symbol: string): Promise<Ticker24hr> {
    try {
      const response = await fetch(`${this.baseUrl}/ticker?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ticker');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching ticker:', error);
      throw error;
    }
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/ticker/price?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Error fetching price:', error);
      return 0;
    }
  }
}