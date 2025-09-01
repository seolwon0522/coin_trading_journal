'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/lib/api/portfolio-api';
import { toast } from 'sonner';

/**
 * 포트폴리오 잔고 조회 Hook
 */
export function usePortfolioBalance() {
  return useQuery({
    queryKey: ['portfolio', 'balance'],
    queryFn: portfolioApi.getBalance,
    staleTime: 1000 * 60 * 1, // 1분
    refetchInterval: 1000 * 60 * 1, // 1분마다 자동 새로고침
    retry: 2,
  });
}

/**
 * 포트폴리오 새로고침 Hook
 */
export function useRefreshPortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: portfolioApi.refreshBalance,
    onSuccess: (data) => {
      queryClient.setQueryData(['portfolio', 'balance'], data);
      toast.success('포트폴리오가 새로고침되었습니다');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || '포트폴리오 새로고침 중 오류가 발생했습니다';
      toast.error(errorMessage);
    },
  });
}