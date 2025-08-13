import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { tradesApi } from '@/lib/api/trades-api';
import { Trade, TradesResponse, CreateTradeRequest, TradeFilters } from '@/types/trade';

// 쿼리 키 상수
export const TRADES_QUERY_KEYS = {
  all: ['trades'] as const,
  list: (filters?: TradeFilters) => ['trades', 'list', filters] as const,
  detail: (id: string) => ['trades', 'detail', id] as const,
} as const;

// 거래 목록 조회 hook
export function useTrades(filters?: TradeFilters): UseQueryResult<TradesResponse, Error> {
  return useQuery({
    queryKey: TRADES_QUERY_KEYS.list(filters),
    queryFn: () => tradesApi.getTrades(filters),
    staleTime: 30 * 1000, // 30초
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// 최근 거래 10건 조회 hook
export function useRecentTrades(): UseQueryResult<TradesResponse, Error> {
  return useTrades({
    limit: 10,
    sortBy: 'entryTime',
    sortOrder: 'desc',
  });
}

// 거래 등록 mutation hook
export function useCreateTrade(): UseMutationResult<Trade, Error, CreateTradeRequest> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tradesApi.createTrade,
    onSuccess: (newTrade) => {
      // 거래 목록 쿼리 무효화하여 자동 갱신
      queryClient.invalidateQueries({
        queryKey: TRADES_QUERY_KEYS.all,
      });

      // 새 거래를 기존 캐시에 optimistically 추가
      queryClient.setQueriesData<TradesResponse>({ queryKey: TRADES_QUERY_KEYS.all }, (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          trades: [newTrade, ...oldData.trades.slice(0, oldData.limit - 1)],
          total: oldData.total + 1,
        };
      });
    },
    onError: (error) => {
      console.error('거래 등록 실패:', error);
    },
  });
}

// 거래 수정 mutation hook (향후 확장용)
export function useUpdateTrade(): UseMutationResult<
  Trade,
  Error,
  { id: string; data: Partial<CreateTradeRequest> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => tradesApi.updateTrade(id, data),
    onSuccess: (updatedTrade) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: TRADES_QUERY_KEYS.all,
      });

      queryClient.invalidateQueries({
        queryKey: TRADES_QUERY_KEYS.detail(updatedTrade.id),
      });
    },
    onError: (error) => {
      console.error('거래 수정 실패:', error);
    },
  });
}

// 거래 삭제 mutation hook (향후 확장용)
export function useDeleteTrade(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tradesApi.deleteTrade,
    onSuccess: (_, deletedId) => {
      // 삭제된 거래를 캐시에서 제거
      queryClient.setQueriesData<TradesResponse>({ queryKey: TRADES_QUERY_KEYS.all }, (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          trades: oldData.trades.filter((trade) => trade.id !== deletedId),
          total: oldData.total - 1,
        };
      });

      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({
        queryKey: TRADES_QUERY_KEYS.all,
      });
    },
    onError: (error) => {
      console.error('거래 삭제 실패:', error);
    },
  });
}
