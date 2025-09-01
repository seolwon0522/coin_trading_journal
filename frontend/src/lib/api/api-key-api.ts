import { apiClient } from '@/lib/axios';
import type { 
  ApiKey, 
  ApiKeyRequest, 
  TradeSyncRequest, 
  TradeSyncResponse 
} from '@/types/api-key';
import type { ApiResponse } from '@/types/api-response';

/**
 * API 키 관련 API 호출 함수들
 */
export const apiKeyApi = {
  /**
   * API 키 목록 조회
   */
  async getApiKeys(): Promise<ApiKey[]> {
    const response = await apiClient.get<ApiResponse<ApiKey[]>>('/api-keys');
    return response.data.data;
  },

  /**
   * API 키 등록
   */
  async createApiKey(request: ApiKeyRequest): Promise<ApiKey> {
    const response = await apiClient.post<ApiResponse<ApiKey>>(
      '/api-keys',
      request
    );
    return response.data.data;
  },

  /**
   * API 키 수정
   */
  async updateApiKey(keyId: number, request: Partial<ApiKeyRequest>): Promise<ApiKey> {
    const response = await apiClient.put<ApiResponse<ApiKey>>(
      `/api-keys/${keyId}`,
      request
    );
    return response.data.data;
  },

  /**
   * API 키 삭제
   */
  async deleteApiKey(keyId: number): Promise<void> {
    await apiClient.delete(`/api-keys/${keyId}`);
  },

  /**
   * API 키 테스트
   */
  async testApiKey(keyId: number): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>(
      `/api-keys/${keyId}/test`
    );
    return response.data.data;
  },

  /**
   * API 키 검증 (등록 전)
   */
  async validateApiKey(request: ApiKeyRequest): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>(
      '/api-keys/validate',
      request
    );
    return response.data.data;
  },

  /**
   * 특정 거래소의 활성 API 키 조회
   */
  async getActiveApiKey(exchange: string): Promise<ApiKey> {
    const response = await apiClient.get<ApiResponse<ApiKey>>(
      `/api-keys/active/${exchange}`
    );
    return response.data.data;
  },
};

/**
 * 거래 동기화 관련 API 호출 함수들
 */
export const tradeSyncApi = {
  /**
   * Binance 거래 동기화
   */
  async syncBinanceTrades(request: TradeSyncRequest): Promise<TradeSyncResponse> {
    const response = await apiClient.post<ApiResponse<TradeSyncResponse>>(
      '/trades/sync/binance',
      request
    );
    return response.data.data;
  },

  /**
   * 빠른 동기화 (최근 24시간)
   */
  async quickSync(): Promise<TradeSyncResponse> {
    const response = await apiClient.post<ApiResponse<TradeSyncResponse>>(
      '/trades/sync/binance/quick'
    );
    return response.data.data;
  },
};