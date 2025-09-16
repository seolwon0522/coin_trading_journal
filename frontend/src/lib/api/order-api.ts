import { authStorage } from '@/lib/auth-storage';

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderResponse {
  id: number;
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  type: string;
  side: string;
  stopPrice?: string;
  icebergQty?: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  origQuoteOrderQty: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceInfo {
  asset: string;
  free: number;
  locked: number;
  total: number;
  priceUsdt?: number;
  valueUsdt?: number;
  allocation?: number;
}

export interface PortfolioBalanceResponse {
  totalValueUsdt: number;
  totalValueBtc?: number;
  balances: BalanceInfo[];
  timestamp?: string;
}

export class OrderApi {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // authStorage를 통해 토큰 관리 (메모리 캐싱 및 일관성 유지)
    const token = authStorage.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async placeOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(orderRequest),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to place order');
      }

      return await response.json();
    } catch (error) {
      console.error('Order placement failed:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: number): Promise<OrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel order');
      }

      return await response.json();
    } catch (error) {
      console.error('Order cancellation failed:', error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<OrderResponse[]> {
    try {
      const url = symbol
        ? `${this.baseUrl}/orders/open?symbol=${symbol}`
        : `${this.baseUrl}/orders/open`;

      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch open orders');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch open orders:', error);
      throw error;
    }
  }

  async getOrderHistory(): Promise<OrderResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch order history');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch order history:', error);
      throw error;
    }
  }

  async getBalance(): Promise<BalanceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/portfolio/balance`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch balance');
      }

      const result = await response.json();
      console.log('Balance API Response:', result); // 디버깅용

      // ApiResponse 래퍼를 처리
      if (result.success && result.data) {
        const portfolioData = result.data;
        console.log('Portfolio Data:', portfolioData); // 디버깅용

        // balances 배열 반환
        return portfolioData.balances || [];
      } else if (result.balances) {
        // 직접 balances가 있는 경우
        return result.balances;
      } else {
        console.warn('Unexpected balance response structure:', result);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      throw error;
    }
  }

  async getAssetBalance(asset: string): Promise<BalanceInfo | null> {
    try {
      const balances = await this.getBalance();
      return balances.find(b => b.asset === asset) || null;
    } catch (error) {
      console.error(`Failed to fetch ${asset} balance:`, error);
      return null;
    }
  }
}