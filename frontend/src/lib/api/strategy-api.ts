import { apiClient } from '@/lib/axios';

export interface StrategyParams {
  // EMA Cross parameters
  trade_size?: string;
  fast_ema_period?: number;
  slow_ema_period?: number;
  use_bracket_orders?: boolean;
  stop_loss_pct?: string;
  take_profit_pct?: string;

  // Market Maker parameters
  atr_period?: number;
  atr_multiple?: number;
  max_inventory?: string;
  spread_multiplier?: number;
  max_orders_per_side?: number;

  // Orderbook Imbalance parameters
  book_depth?: number;
  imbalance_threshold?: number;
  min_volume_ratio?: number;
  entry_threshold?: number;
  exit_threshold?: number;
  min_holding_secs?: number;
  max_holding_secs?: number;
}

export type StrategyType = 'EMA_CROSS' | 'MARKET_MAKER' | 'ORDERBOOK_IMBALANCE';

export interface StrategyRequest {
  name: string;
  type: StrategyType;
  symbol: string;
  params: StrategyParams;
  description?: string;
  testnet?: boolean;
}

export interface StrategyResponse {
  id: number;
  name: string;
  type: StrategyType;
  symbol: string;
  params: StrategyParams;
  active: boolean;
  testnet: boolean;

  // Performance metrics
  totalTrades?: number;
  winRate?: number;
  totalReturn?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  realizedPnl?: number;
  unrealizedPnl?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  deactivatedAt?: string;
  lastTradeAt?: string;

  description?: string;
  nautilusStrategyId?: string;
}

export interface StrategiesPageResponse {
  content: StrategyResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export const strategyApi = {
  /**
   * 전략 생성
   */
  create: async (data: StrategyRequest): Promise<StrategyResponse> => {
    const response = await apiClient.post('/api/strategies', data);
    return response.data.data;
  },

  /**
   * 전략 수정
   */
  update: async (id: number, data: StrategyRequest): Promise<StrategyResponse> => {
    const response = await apiClient.put(`/api/strategies/${id}`, data);
    return response.data.data;
  },

  /**
   * 전략 삭제
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/strategies/${id}`);
  },

  /**
   * 전략 단건 조회
   */
  get: async (id: number): Promise<StrategyResponse> => {
    const response = await apiClient.get(`/api/strategies/${id}`);
    return response.data.data;
  },

  /**
   * 전략 목록 조회
   */
  list: async (
    page = 0,
    size = 10,
    sortBy = 'createdAt',
    direction = 'DESC'
  ): Promise<StrategiesPageResponse> => {
    const response = await apiClient.get('/api/strategies', {
      params: { page, size, sortBy, direction }
    });
    return response.data.data;
  },

  /**
   * 활성화된 전략 목록 조회
   */
  getActive: async (): Promise<StrategyResponse[]> => {
    const response = await apiClient.get('/api/strategies/active');
    return response.data.data;
  },

  /**
   * 전략 활성화
   */
  activate: async (id: number): Promise<void> => {
    await apiClient.post(`/api/strategies/${id}/activate`);
  },

  /**
   * 전략 비활성화
   */
  deactivate: async (id: number): Promise<void> => {
    await apiClient.post(`/api/strategies/${id}/deactivate`);
  },

  /**
   * 전략 상태 동기화
   */
  sync: async (id: number): Promise<void> => {
    await apiClient.post(`/api/strategies/${id}/sync`);
  },

  /**
   * 전략 템플릿 가져오기
   */
  getTemplate: async (type: string): Promise<StrategyRequest> => {
    const response = await apiClient.get(`/api/strategies/templates/${type}`);
    return response.data.data;
  }
};

/**
 * 전략 타입 한글 변환
 */
export const getStrategyTypeLabel = (type: StrategyType): string => {
  switch (type) {
    case 'EMA_CROSS':
      return 'EMA 교차';
    case 'MARKET_MAKER':
      return '마켓 메이커';
    case 'ORDERBOOK_IMBALANCE':
      return '오더북 불균형';
    default:
      return '알 수 없음';
  }
};

/**
 * 전략 상태 텍스트
 */
export const getStrategyStatusText = (active: boolean, deactivatedAt?: string): string => {
  if (active) {
    return '실행중';
  } else if (deactivatedAt) {
    return '중지됨';
  } else {
    return '대기중';
  }
};

/**
 * 전략 상태 색상 클래스
 */
export const getStrategyStatusColor = (active: boolean): string => {
  return active ? 'text-green-600' : 'text-gray-500';
};