import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { statisticsApi } from '@/lib/api/statistics-api';
import { TradeStatistics, StatisticsRequest, SymbolStatistics, DailyPnL } from '@/types/statistics';

// 쿼리 키 상수
export const STATISTICS_QUERY_KEYS = {
  all: ['statistics'] as const,
  general: (request?: StatisticsRequest) => ['statistics', 'general', request] as const,
  symbols: () => ['statistics', 'symbols'] as const,
  dailyPnl: (days: number) => ['statistics', 'daily-pnl', days] as const,
  timeHeatmap: () => ['statistics', 'time-heatmap'] as const,
} as const;

/**
 * 거래 통계 조회 hook
 */
export function useTradeStatistics(
  request?: StatisticsRequest
): UseQueryResult<TradeStatistics, Error> {
  return useQuery({
    queryKey: STATISTICS_QUERY_KEYS.general(request),
    queryFn: () => statisticsApi.getStatistics(request),
    staleTime: 60 * 1000, // 1분
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * 심볼별 통계 조회 hook
 */
export function useSymbolStatistics(): UseQueryResult<SymbolStatistics[], Error> {
  return useQuery({
    queryKey: STATISTICS_QUERY_KEYS.symbols(),
    queryFn: statisticsApi.getSymbolStatistics,
    staleTime: 60 * 1000, // 1분
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * 일별 손익 데이터 조회 hook
 */
export function useDailyPnL(days: number = 30): UseQueryResult<DailyPnL[], Error> {
  return useQuery({
    queryKey: STATISTICS_QUERY_KEYS.dailyPnl(days),
    queryFn: () => statisticsApi.getDailyPnL(days),
    staleTime: 60 * 1000, // 1분
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * 시간대별 통계 조회 hook (히트맵용)
 */
export function useTimeStatistics(): UseQueryResult<any, Error> {
  return useQuery({
    queryKey: STATISTICS_QUERY_KEYS.timeHeatmap(),
    queryFn: statisticsApi.getTimeStatistics,
    staleTime: 60 * 1000, // 1분
    refetchOnWindowFocus: false,
    retry: 2,
  });
}