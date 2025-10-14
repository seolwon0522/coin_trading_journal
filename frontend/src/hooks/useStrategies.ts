/**
 * Nautilus 전략 관리를 위한 React Query 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import {
  strategiesApi,
  strategyKeys,
  Strategy,
  CreateStrategyRequest,
  UpdateStrategyRequest,
  StrategyPerformance,
} from '@/lib/api/strategies';

/**
 * 전략 목록 조회
 */
export function useStrategies() {
  return useQuery({
    queryKey: strategyKeys.lists(),
    queryFn: strategiesApi.getStrategies,
    refetchInterval: 5000, // 5초마다 자동 갱신
    staleTime: 3000,
  });
}

/**
 * 전략 상세 조회
 */
export function useStrategy(id: number, enabled = true) {
  return useQuery({
    queryKey: strategyKeys.detail(id),
    queryFn: () => strategiesApi.getStrategy(id),
    enabled,
    refetchInterval: 5000,
  });
}

/**
 * 전략 성과 조회
 */
export function useStrategyPerformance(id: number, enabled = true) {
  return useQuery({
    queryKey: strategyKeys.performance(id),
    queryFn: () => strategiesApi.getPerformance(id),
    enabled,
    refetchInterval: 10000, // 10초마다 갱신
  });
}

/**
 * 전략 거래 내역 조회
 */
export function useStrategyTrades(
  id: number,
  params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  },
  enabled = true
) {
  return useQuery({
    queryKey: strategyKeys.trades(id, params),
    queryFn: () => strategiesApi.getTrades(id, params),
    enabled,
  });
}

/**
 * 전략 생성
 */
export function useCreateStrategy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: CreateStrategyRequest) => strategiesApi.createStrategy(request),
    onSuccess: (newStrategy) => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      toast({
        title: '전략 생성 완료',
        description: `${newStrategy.name} 전략이 생성되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: '전략 생성 실패',
        description: error.response?.data?.message || '전략 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * 전략 수정
 */
export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateStrategyRequest }) =>
      strategiesApi.updateStrategy(id, request),
    onSuccess: (updatedStrategy) => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.detail(updatedStrategy.id) });
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      toast({
        title: '전략 수정 완료',
        description: `${updatedStrategy.name} 전략이 수정되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: '전략 수정 실패',
        description: error.response?.data?.message || '전략 수정 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * 전략 삭제
 */
export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => strategiesApi.deleteStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      toast({
        title: '전략 삭제 완료',
        description: '전략이 삭제되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '전략 삭제 실패',
        description: error.response?.data?.message || '전략 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * 전략 활성화 (자동매매 시작)
 */
export function useActivateStrategy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => strategiesApi.activateStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      toast({
        title: '자동매매 시작',
        description: '전략이 활성화되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '자동매매 시작 실패',
        description: error.response?.data?.message || '전략 활성화 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * 전략 비활성화 (자동매매 중지)
 */
export function useDeactivateStrategy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => strategiesApi.deactivateStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      toast({
        title: '자동매매 중지',
        description: '전략이 비활성화되었습니다.',
      });
    },
    onError: (error: any) => {
      toast({
        title: '자동매매 중지 실패',
        description: error.response?.data?.message || '전략 비활성화 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * 전략 Nautilus 동기화
 */
export function useSyncStrategy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => strategiesApi.syncWithNautilus(id),
    onSuccess: (strategy) => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.detail(strategy.id) });
      queryClient.invalidateQueries({ queryKey: strategyKeys.performance(strategy.id) });
      toast({
        title: '동기화 완료',
        description: `${strategy.name} 전략이 Nautilus와 동기화되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: '동기화 실패',
        description: error.response?.data?.message || '동기화 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * 전략 템플릿 목록 조회
 */
export function useStrategyTemplates() {
  return useQuery({
    queryKey: ['strategy-templates'],
    queryFn: strategiesApi.getTemplates,
    staleTime: Infinity, // 템플릿은 변하지 않으므로 무한 캐시
  });
}

/**
 * 전략 통합 상태 훅 (상세 + 성과)
 */
export function useStrategyWithPerformance(id: number) {
  const strategyQuery = useStrategy(id);
  const performanceQuery = useStrategyPerformance(id, !!strategyQuery.data);

  return {
    strategy: strategyQuery.data,
    performance: performanceQuery.data,
    isLoading: strategyQuery.isLoading || performanceQuery.isLoading,
    error: strategyQuery.error || performanceQuery.error,
    refetch: () => {
      strategyQuery.refetch();
      performanceQuery.refetch();
    },
  };
}
