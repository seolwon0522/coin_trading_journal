import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  runBacktest,
  getBacktest,
  getBacktestsByStrategy,
  getBacktests,
  deleteBacktest,
  compareBacktests,
  BacktestRequest,
  BacktestResponse,
} from '@/lib/api/backtests';
import { toast } from 'sonner';

/**
 * 백테스트 실행 훅
 */
export function useRunBacktest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: runBacktest,
    onSuccess: (data) => {
      toast.success('백테스트가 완료되었습니다');
      queryClient.invalidateQueries({ queryKey: ['backtests'] });
      queryClient.invalidateQueries({
        queryKey: ['backtest-history', data.strategyId],
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '백테스트 실행에 실패했습니다';
      toast.error(message);
    },
  });
}

/**
 * 백테스트 단건 조회 훅
 */
export function useBacktest(backtestId: number | null) {
  return useQuery({
    queryKey: ['backtest', backtestId],
    queryFn: () => getBacktest(backtestId!),
    enabled: !!backtestId,
  });
}

/**
 * 전략별 백테스트 이력 조회 훅
 */
export function useBacktestsByStrategy(strategyId: number, page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: ['backtest-history', strategyId, page, size],
    queryFn: () => getBacktestsByStrategy(strategyId, page, size),
  });
}

/**
 * 전체 백테스트 이력 조회 훅
 */
export function useBacktests(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: ['backtests', page, size],
    queryFn: () => getBacktests(page, size),
  });
}

/**
 * 백테스트 삭제 훅
 */
export function useDeleteBacktest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBacktest,
    onSuccess: () => {
      toast.success('백테스트가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['backtests'] });
      queryClient.invalidateQueries({ queryKey: ['backtest-history'] });
    },
    onError: () => {
      toast.error('백테스트 삭제에 실패했습니다');
    },
  });
}

/**
 * 백테스트 비교 훅
 */
export function useCompareBacktests() {
  return useMutation({
    mutationFn: compareBacktests,
    onError: () => {
      toast.error('백테스트 비교에 실패했습니다');
    },
  });
}
