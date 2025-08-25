import { apiClient } from '@/lib/axios';

// 심플한 타입 정의 (백엔드와 동일하게)
export interface Trade {
  id?: number;
  symbol: string;
  type: 'SPOT' | 'FUTURES' | 'MARGIN';
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedAt: string;
  fee?: number;
  feeAsset?: string;
  notes?: string;
  strategy?: string;
  stopLoss?: number;
  takeProfit?: number;
  tradingStrategy?: 'BREAKOUT' | 'TREND' | 'COUNTER_TREND' | 'SCALPING' | 'SWING' | 'POSITION';
  entryTime?: string;
  exitTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// 심플한 API 함수들
export const tradesApi = {
  // 거래 목록 조회
  async getTrades(page = 0, size = 20, sortBy = 'executedAt', direction = 'DESC') {
    try {
      const response = await apiClient.get(
        `/api/trades?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`
      );
      
      // 백엔드 응답 처리
      if (response.data?.success && response.data?.data) {
        return response.data.data as PageResponse<Trade>;
      }
      throw new Error('Failed to fetch trades');
    } catch (error: any) {
      console.error('Failed to fetch trades:', error);
      throw error;
    }
  },

  // 거래 생성
  async createTrade(trade: Trade) {
    try {
      const response = await apiClient.post('/api/trades', trade);
      
      if (response.data?.success && response.data?.data) {
        return response.data.data as Trade;
      }
      throw new Error(response.data?.message || 'Failed to create trade');
    } catch (error: any) {
      console.error('Failed to create trade:', error);
      throw error;
    }
  },

  // 거래 수정
  async updateTrade(id: number, trade: Trade) {
    try {
      const response = await apiClient.put(`/api/trades/${id}`, trade);
      
      if (response.data?.success && response.data?.data) {
        return response.data.data as Trade;
      }
      throw new Error('Failed to update trade');
    } catch (error: any) {
      console.error('Failed to update trade:', error);
      throw error;
    }
  },

  // 거래 삭제
  async deleteTrade(id: number) {
    try {
      const response = await apiClient.delete(`/api/trades/${id}`);
      
      if (response.data?.success) {
        return true;
      }
      throw new Error('Failed to delete trade');
    } catch (error: any) {
      console.error('Failed to delete trade:', error);
      throw error;
    }
  },

  // 단일 거래 조회
  async getTrade(id: number) {
    try {
      const response = await apiClient.get(`/api/trades/${id}`);
      
      if (response.data?.success && response.data?.data) {
        return response.data.data as Trade;
      }
      throw new Error('Failed to fetch trade');
    } catch (error: any) {
      console.error('Failed to fetch trade:', error);
      throw error;
    }
  },

  // 최근 거래 조회
  async getRecentTrades(limit = 10) {
    try {
      const response = await apiClient.get(`/api/trades/recent?limit=${limit}`);
      
      if (response.data?.success && response.data?.data) {
        return response.data.data as Trade[];
      }
      throw new Error('Failed to fetch recent trades');
    } catch (error: any) {
      console.error('Failed to fetch recent trades:', error);
      throw error;
    }
  },
};