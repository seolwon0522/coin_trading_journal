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