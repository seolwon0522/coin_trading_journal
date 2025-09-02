import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/lib/api/portfolio-api';
import { Portfolio, PortfolioSummary, UpdateBuyPriceRequest } from '@/types/portfolio';
import { toast } from 'sonner';

/**
 * 포트폴리오 관리 커스텀 훅
 */
export function usePortfolio() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 포트폴리오 로드
  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const [portfolioData, summaryData] = await Promise.all([
        portfolioApi.getPortfolio(),
        portfolioApi.getPortfolioSummary()
      ]);
      setPortfolios(portfolioData);
      setSummary(summaryData);
    } catch (error: any) {
      // 401 에러는 조용히 처리 (로그인 전)
      if (error.response?.status !== 401) {
        toast.error('포트폴리오 로드 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  // 포트폴리오 동기화
  const syncPortfolio = async () => {
    setSyncing(true);
    try {
      const result = await portfolioApi.syncPortfolio();
      toast.success(result.message);
      await loadPortfolio(); // 새로고침
      return result;
    } catch (error) {
      toast.error('포트폴리오 동기화 실패');
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  // 평균 매수가 업데이트
  const updateBuyPrice = async (request: UpdateBuyPriceRequest) => {
    try {
      const updated = await portfolioApi.updateBuyPrice(request);
      toast.success('평균 매수가가 업데이트되었습니다');
      await loadPortfolio(); // 새로고침
      return updated;
    } catch (error) {
      toast.error('평균 매수가 업데이트 실패');
      throw error;
    }
  };

  // 현재가 업데이트
  const updatePrices = async () => {
    try {
      await portfolioApi.updateCurrentPrices();
      toast.success('현재가가 업데이트되었습니다');
      await loadPortfolio(); // 새로고침
    } catch (error) {
      toast.error('현재가 업데이트 실패');
      throw error;
    }
  };

  // 초기 로드
  useEffect(() => {
    loadPortfolio();
  }, []);

  return {
    portfolios,
    summary,
    loading,
    syncing,
    loadPortfolio,
    syncPortfolio,
    updateBuyPrice,
    updatePrices
  };
}

/**
 * 실시간 포트폴리오 잔고 조회 훅
 */
export function usePortfolioBalance() {
  return useQuery({
    queryKey: ['portfolio', 'balance'],
    queryFn: async () => {
      const response = await portfolioApi.getBalance();
      return response;
    },
    refetchInterval: 60000, // 1분마다 자동 새로고침
    staleTime: 30000, // 30초 캐싱
  });
}

/**
 * 포트폴리오 새로고침 훅
 */
export function useRefreshPortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await portfolioApi.getBalance();
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['portfolio', 'balance'], data);
      toast.success('포트폴리오가 새로고침되었습니다');
    },
    onError: () => {
      toast.error('포트폴리오 새로고침 실패');
    }
  });
}

/**
 * 포트폴리오 동기화 훅 (DB 동기화)
 */
export function useSyncPortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: portfolioApi.syncPortfolio,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast.success(data.message || '포트폴리오 동기화 완료');
    },
    onError: () => {
      toast.error('포트폴리오 동기화 실패');
    }
  });
}
