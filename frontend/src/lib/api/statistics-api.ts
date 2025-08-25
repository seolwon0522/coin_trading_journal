import { apiClient } from '@/lib/axios';
import { TradeStatistics, StatisticsRequest, SymbolStatistics, DailyPnL } from '@/types/statistics';
import { mapApiResponseToStatistics, mapStatisticsRequestToApi, ApiStatisticsResponse } from './statistics-mapper';

/**
 * 통계 API 클라이언트
 */
export const statisticsApi = {
  /**
   * 거래 통계 조회
   */
  getStatistics: async (request?: StatisticsRequest): Promise<TradeStatistics> => {
    try {
      const apiRequest = request ? mapStatisticsRequestToApi(request) : {};
      
      const response = await apiClient.get<ApiStatisticsResponse>('/api/trades/statistics', {
        params: apiRequest,
        baseURL: '',
      });
      
      return mapApiResponseToStatistics(response.data);
    } catch (error) {
      console.error('통계 조회 실패:', error);
      throw new Error('통계를 불러오는데 실패했습니다');
    }
  },

  /**
   * 심볼별 통계 조회
   */
  getSymbolStatistics: async (): Promise<SymbolStatistics[]> => {
    try {
      const response = await apiClient.get<SymbolStatistics[]>('/api/trades/statistics/symbols', {
        baseURL: '',
      });
      
      // 심볼별 통계는 이미 올바른 형식이므로 직접 반환
      return response.data;
    } catch (error) {
      console.error('심볼별 통계 조회 실패:', error);
      throw new Error('심볼별 통계를 불러오는데 실패했습니다');
    }
  },

  /**
   * 일별 손익 데이터 조회 (차트용)
   */
  getDailyPnL: async (days: number = 30): Promise<DailyPnL[]> => {
    try {
      const response = await apiClient.get<DailyPnL[]>('/api/trades/statistics/daily-pnl', {
        params: { days },
        baseURL: '',
      });
      
      return response.data;
    } catch (error) {
      console.error('일별 손익 조회 실패:', error);
      throw new Error('일별 손익 데이터를 불러오는데 실패했습니다');
    }
  },

  /**
   * 시간대별 통계 조회 (히트맵용)
   */
  getTimeStatistics: async (): Promise<any> => {
    try {
      const response = await apiClient.get('/api/trades/statistics/time-heatmap', {
        baseURL: '',
      });
      
      return response.data;
    } catch (error) {
      console.error('시간대별 통계 조회 실패:', error);
      throw new Error('시간대별 통계를 불러오는데 실패했습니다');
    }
  },
};