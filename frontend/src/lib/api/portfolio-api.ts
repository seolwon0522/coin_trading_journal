import { apiClient } from '@/lib/axios';
import { 
  Portfolio, 
  PortfolioSummary, 
  UpdateBuyPriceRequest, 
  PortfolioSyncResult,
  PortfolioBalance 
} from '@/types/portfolio';

/**
 * 포트폴리오 API 클라이언트
 */
export const portfolioApi = {
  /**
   * 실시간 잔고 조회 (Binance API)
   */
  async getBalance(): Promise<PortfolioBalance> {
    const response = await apiClient.get('/api/portfolio/balance');
    return response.data.data;
  },

  /**
   * 포트폴리오 조회 (DB)
   */
  async getPortfolio(): Promise<Portfolio[]> {
    const response = await apiClient.get('/api/portfolio');
    return response.data.data;
  },

  /**
   * 포트폴리오 요약 정보 조회
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const response = await apiClient.get('/api/portfolio/summary');
    return response.data.data;
  },

  /**
   * 포트폴리오 동기화
   */
  async syncPortfolio(): Promise<PortfolioSyncResult> {
    const response = await apiClient.post('/api/portfolio/sync');
    return response.data.data;
  },

  /**
   * 평균 매수가 업데이트
   */
  async updateBuyPrice(request: UpdateBuyPriceRequest): Promise<Portfolio> {
    const response = await apiClient.put('/api/portfolio/buy-price', request);
    return response.data.data;
  },

  /**
   * 현재가 업데이트
   */
  async updateCurrentPrices(): Promise<void> {
    await apiClient.post('/api/portfolio/update-prices');
  }
};
