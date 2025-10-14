import { apiClient } from '@/lib/axios';

export interface BacktestRequest {
  strategyId: number;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  initialCapital: number;
  timeframe: string;  // 1m, 5m, 15m, 1h, 4h, 1d
  additionalParams?: Record<string, any>;
  description?: string;
}

export interface BacktestResponse {
  id: number;
  strategyId: number;
  strategyName: string;
  strategyType: string;
  symbol: string;
  startDate: string;
  endDate: string;
  timeframe: string;
  initialCapital: number | null;
  finalCapital: number | null;
  totalTrades: number | null;
  winningTrades: number | null;
  losingTrades: number | null;
  winRate: number | null;
  totalReturn: number | null;
  totalPnl: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  avgWin?: number | null;
  avgLoss?: number | null;
  profitFactor?: number | null;
  maxConsecutiveWins?: number | null;
  maxConsecutiveLosses?: number | null;
  resultData?: Record<string, any>;
  description?: string;
  createdAt: string;
}

export interface BacktestComparison {
  backtests: BacktestResponse[];
  summary: {
    bestReturn: number;
    bestSharpe: number;
    avgWinRate: number;
  };
}

/**
 * 백테스트 실행
 */
export async function runBacktest(request: BacktestRequest): Promise<BacktestResponse> {
  const response = await apiClient.post('/api/backtests', request);
  return response.data.data;
}

/**
 * 백테스트 결과 조회
 */
export async function getBacktest(backtestId: number): Promise<BacktestResponse> {
  const response = await apiClient.get(`/api/backtests/${backtestId}`);
  return response.data.data;
}

/**
 * 전략별 백테스트 이력 조회
 */
export async function getBacktestsByStrategy(
  strategyId: number,
  page: number = 0,
  size: number = 10
): Promise<{ content: BacktestResponse[]; totalPages: number; totalElements: number }> {
  const response = await apiClient.get(`/api/backtests/strategy/${strategyId}`, {
    params: { page, size },
  });
  return response.data.data;
}

/**
 * 사용자의 모든 백테스트 이력 조회
 */
export async function getBacktests(
  page: number = 0,
  size: number = 10
): Promise<{ content: BacktestResponse[]; totalPages: number; totalElements: number }> {
  const response = await apiClient.get('/api/backtests', {
    params: { page, size },
  });
  return response.data.data;
}

/**
 * 백테스트 삭제
 */
export async function deleteBacktest(backtestId: number): Promise<void> {
  await apiClient.delete(`/api/backtests/${backtestId}`);
}

/**
 * 백테스트 비교
 */
export async function compareBacktests(backtestIds: number[]): Promise<BacktestComparison> {
  const response = await apiClient.post('/api/backtests/compare', backtestIds);
  return response.data.data;
}
