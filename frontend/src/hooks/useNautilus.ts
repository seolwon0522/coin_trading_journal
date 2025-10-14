import { useQuery } from '@tanstack/react-query';
import { apiClient as axios } from '@/lib/axios';

interface NodeStatus {
  isRunning: boolean;
  mode: string;
  strategiesCount: number;
  activeStrategies: number;
}

interface Portfolio {
  status: string;
  balances: Record<string, any>;
  positions: any[];
  openOrders: number;
}

/**
 * Nautilus Node 상태 조회 훅
 */
export function useNautilusStatus(refetchInterval: number = 5000) {
  return useQuery<NodeStatus>({
    queryKey: ['nautilus', 'status'],
    queryFn: async () => {
      const { data } = await axios.get<any>('/api/nautilus/status');
      return data.data || data;
    },
    refetchInterval,
    retry: 1,
  });
}

/**
 * 포트폴리오 조회 훅
 */
export function usePortfolio(enabled: boolean = true, refetchInterval: number = 5000) {
  return useQuery<Portfolio>({
    queryKey: ['nautilus', 'portfolio'],
    queryFn: async () => {
      const { data } = await axios.get<any>('/api/nautilus/portfolio');
      return data.data || data;
    },
    enabled,
    refetchInterval,
    retry: 1,
  });
}

/**
 * Nautilus 서비스 헬스체크
 */
export function useNautilusHealth() {
  return useQuery({
    queryKey: ['nautilus', 'health'],
    queryFn: async () => {
      try {
        const { data } = await axios.get<any>('/api/nautilus/health');
        return data.data || data;
      } catch (error) {
        return { healthy: false, service: 'Nautilus Trading Engine' };
      }
    },
    refetchInterval: 10000,
    retry: false,
  });
}
