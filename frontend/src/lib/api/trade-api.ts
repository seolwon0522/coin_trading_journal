import { apiClient } from '@/lib/axios';
import { Trade, TradeRequest, TradesPageResponse } from '@/types/trade';

export const tradeApi = {
  /**
   * 거래 생성
   */
  create: async (data: TradeRequest): Promise<Trade> => {
    const response = await apiClient.post('/api/trades', data);
    return response.data.data;
  },

  /**
   * 거래 수정
   */
  update: async (id: number, data: TradeRequest): Promise<Trade> => {
    const response = await apiClient.put(`/api/trades/${id}`, data);
    return response.data.data;
  },

  /**
   * 거래 삭제
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/trades/${id}`);
  },

  /**
   * 거래 단건 조회
   */
  get: async (id: number): Promise<Trade> => {
    const response = await apiClient.get(`/api/trades/${id}`);
    return response.data.data;
  },

  /**
   * 거래 목록 조회
   */
  list: async (
    page = 0,
    size = 20,
    sortBy = 'entryTime',
    direction = 'DESC'
  ): Promise<TradesPageResponse> => {
    const response = await apiClient.get('/api/trades', {
      params: { page, size, sortBy, direction }
    });
    return response.data.data;
  }
};