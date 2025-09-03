import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioApi } from '@/lib/api/portfolio-api';
import { Portfolio, PortfolioSummary, UpdateBuyPriceRequest } from '@/types/portfolio';
import { toast } from 'sonner';

// 실시간 업데이트 간격 옵션 (밀리초)
export const REFRESH_INTERVALS = {
  OFF: false as const,
  SLOW: 30000,    // 30초
  NORMAL: 10000,  // 10초 (기본값)
  FAST: 5000,     // 5초
  REALTIME: 3000  // 3초
} as const;

export type RefreshInterval = typeof REFRESH_INTERVALS[keyof typeof REFRESH_INTERVALS];

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
 * 자동 새로고침 간격 설정 가능
 */
export function usePortfolioBalance(refreshInterval: RefreshInterval = REFRESH_INTERVALS.NORMAL) {
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true);
  
  const query = useQuery({
    queryKey: ['portfolio', 'balance'],
    queryFn: async () => {
      const response = await portfolioApi.getBalance();
      return response;
    },
    // 자동 새로고침 설정
    refetchInterval: isAutoRefreshing && refreshInterval ? refreshInterval : false,
    staleTime: refreshInterval ? refreshInterval / 2 : 5000, // 캐시 시간은 새로고침 간격의 절반
    refetchOnWindowFocus: isAutoRefreshing, // 창 포커스 시 자동 새로고침
    refetchOnReconnect: true, // 네트워크 재연결 시 새로고침
  });

  // 자동 새로고침 토글
  const toggleAutoRefresh = () => {
    setIsAutoRefreshing(prev => !prev);
    if (!isAutoRefreshing) {
      toast.success('실시간 업데이트가 활성화되었습니다');
    } else {
      toast.info('실시간 업데이트가 중지되었습니다');
    }
  };

  return {
    ...query,
    isAutoRefreshing,
    toggleAutoRefresh,
    currentInterval: refreshInterval
  };
}

/**
 * 포트폴리오 새로고침 훅 (수동 새로고침)
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

/**
 * 실시간 업데이트 간격 설정 훅
 */
export function useRefreshInterval() {
  const [interval, setInterval] = useState<RefreshInterval>(REFRESH_INTERVALS.NORMAL);
  
  // localStorage에서 설정 불러오기
  useEffect(() => {
    const savedInterval = localStorage.getItem('portfolio-refresh-interval');
    if (savedInterval && savedInterval in REFRESH_INTERVALS) {
      const value = REFRESH_INTERVALS[savedInterval as keyof typeof REFRESH_INTERVALS];
      setInterval(value);
    }
  }, []);
  
  // 간격 변경 함수
  const changeInterval = (newInterval: RefreshInterval) => {
    setInterval(newInterval);
    
    // localStorage에 저장
    const key = Object.entries(REFRESH_INTERVALS).find(([_, value]) => value === newInterval)?.[0];
    if (key) {
      localStorage.setItem('portfolio-refresh-interval', key);
    }
    
    // 알림 표시
    if (newInterval === false) {
      toast.info('실시간 업데이트가 중지되었습니다');
    } else {
      const seconds = newInterval / 1000;
      toast.success(`${seconds}초마다 자동 업데이트됩니다`);
    }
  };
  
  return {
    interval,
    changeInterval,
    intervals: REFRESH_INTERVALS
  };
}