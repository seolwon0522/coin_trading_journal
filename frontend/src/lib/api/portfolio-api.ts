import { apiClient } from '@/lib/axios';
import type { PortfolioBalance } from '@/types/portfolio';
import type { ApiResponse } from '@/types/api-response';

/**
 * 포트폴리오 관련 API 호출 함수들
 */
export const portfolioApi = {
  /**
   * 포트폴리오 잔고 조회
   */
  async getBalance(): Promise<PortfolioBalance> {
    const response = await apiClient.get<ApiResponse<PortfolioBalance>>('/api/portfolio/balance');
    return response.data.data;
  },

  /**
   * 포트폴리오 새로고침
   */
  async refreshBalance(): Promise<PortfolioBalance> {
    const response = await apiClient.post<ApiResponse<PortfolioBalance>>('/api/portfolio/refresh');
    return response.data.data;
  },
};