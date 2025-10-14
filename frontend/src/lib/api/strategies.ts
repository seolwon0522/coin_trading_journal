/**
 * Nautilus 자동매매 전략 API 클라이언트
 * Spring Boot Backend와 통신
 */

import { apiClient as axios } from '../axios';

// 전략 타입 정의 (백엔드 StrategyType enum과 동일)
export type StrategyType =
  | 'EMA_CROSS'
  | 'MARKET_MAKER'
  | 'ORDERBOOK_IMBALANCE';

export type StrategyStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR';

export interface Strategy {
  id: number;
  name: string;
  type: StrategyType;
  symbol: string;
  params: Record<string, any>;
  active: boolean;
  testnet: boolean;
  nautilusStrategyId?: string;

  // 성과 지표
  totalTrades?: number;
  winRate?: number;
  totalReturn?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  deactivatedAt?: string;
  lastTradeAt?: string;

  description?: string;
}

export interface CreateStrategyRequest {
  name: string;
  type: StrategyType;
  symbol: string;
  params: Record<string, any>;
  testnet?: boolean;
}

export interface UpdateStrategyRequest {
  name?: string;
  params?: Record<string, any>;
  testnet?: boolean;
}

export interface StrategyPerformance {
  strategyId: number;
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  realizedPnl: number;
  unrealizedPnl: number;
  lastUpdated: string;
}

export interface StrategyTrade {
  id: number;
  strategyId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  commission: number;
  realizedPnl?: number;
  timestamp: string;
}

// API 클라이언트
export const strategiesApi = {
  /**
   * 전략 목록 조회
   */
  async getStrategies(): Promise<Strategy[]> {
    const { data } = await axios.get<any>('/api/strategies');
    // Backend가 ApiResponse<Page<Strategy>> 형태로 반환
    if (data.data && data.data.content) {
      return data.data.content;
    }
    // Page<Strategy> 형태인 경우
    if (data.content) {
      return data.content;
    }
    // 배열인 경우
    if (Array.isArray(data)) {
      return data;
    }
    // ApiResponse<List<Strategy>> 형태인 경우
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  /**
   * 전략 상세 조회
   */
  async getStrategy(id: number): Promise<Strategy> {
    const { data } = await axios.get<any>(`/api/strategies/${id}`);
    // ApiResponse wrapper 처리
    return data.data || data;
  },

  /**
   * 전략 생성
   */
  async createStrategy(request: CreateStrategyRequest): Promise<Strategy> {
    const { data } = await axios.post<any>('/api/strategies', request);
    // ApiResponse wrapper 처리
    return data.data || data;
  },

  /**
   * 전략 수정
   */
  async updateStrategy(id: number, request: UpdateStrategyRequest): Promise<Strategy> {
    const { data } = await axios.put<any>(`/api/strategies/${id}`, request);
    // ApiResponse wrapper 처리
    return data.data || data;
  },

  /**
   * 전략 삭제
   */
  async deleteStrategy(id: number): Promise<void> {
    await axios.delete(`/api/strategies/${id}`);
  },

  /**
   * 전략 활성화 (자동매매 시작)
   */
  async activateStrategy(id: number): Promise<void> {
    await axios.post(`/api/strategies/${id}/activate`);
  },

  /**
   * 전략 비활성화 (자동매매 중지)
   */
  async deactivateStrategy(id: number): Promise<void> {
    await axios.post(`/api/strategies/${id}/deactivate`);
  },

  /**
   * 전략 성과 조회
   */
  async getPerformance(id: number): Promise<StrategyPerformance> {
    const { data } = await axios.get<any>(`/api/strategies/${id}/performance`);
    // ApiResponse wrapper 처리
    return data.data || data;
  },

  /**
   * 전략 거래 내역 조회
   */
  async getTrades(
    id: number,
    params?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      size?: number;
    }
  ): Promise<{ content: StrategyTrade[]; totalElements: number }> {
    const { data } = await axios.get<any>(`/api/nautilus/strategies/${id}/trades`, { params });
    // ApiResponse wrapper 처리
    return data.data || data;
  },

  /**
   * Nautilus와 전략 동기화
   */
  async syncWithNautilus(id: number): Promise<Strategy> {
    const { data } = await axios.post<any>(`/api/strategies/${id}/sync`);
    // ApiResponse wrapper 처리
    return data.data || data;
  },

  /**
   * 전략 템플릿 목록 조회
   */
  async getTemplates(): Promise<{ type: StrategyType; name: string; description: string; defaultParams: Record<string, any> }[]> {
    const { data } = await axios.get<any>('/api/strategies/templates');
    // ApiResponse wrapper 처리
    return data.data || data;
  },
};

// React Query용 키 팩토리
export const strategyKeys = {
  all: ['strategies'] as const,
  lists: () => [...strategyKeys.all, 'list'] as const,
  list: (filters?: any) => [...strategyKeys.lists(), filters] as const,
  details: () => [...strategyKeys.all, 'detail'] as const,
  detail: (id: number) => [...strategyKeys.details(), id] as const,
  performance: (id: number) => [...strategyKeys.detail(id), 'performance'] as const,
  trades: (id: number, filters?: any) => [...strategyKeys.detail(id), 'trades', filters] as const,
};
