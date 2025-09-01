import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi, tradeSyncApi } from '@/lib/api/api-key-api';
import type { ApiKey, ApiKeyRequest, TradeSyncRequest } from '@/types/api-key';
import { toast } from 'sonner';

/**
 * API 키 관련 React Query hooks
 */

// API 키 목록 조회
export function useApiKeys() {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: apiKeyApi.getApiKeys,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// API 키 생성
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiKeyApi.createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API 키가 성공적으로 등록되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'API 키 등록에 실패했습니다.');
    },
  });
}

// API 키 수정
export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keyId, data }: { keyId: number; data: Partial<ApiKeyRequest> }) =>
      apiKeyApi.updateApiKey(keyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API 키가 성공적으로 수정되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'API 키 수정에 실패했습니다.');
    },
  });
}

// API 키 삭제
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiKeyApi.deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API 키가 성공적으로 삭제되었습니다.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'API 키 삭제에 실패했습니다.');
    },
  });
}

// API 키 테스트
export function useTestApiKey() {
  return useMutation({
    mutationFn: apiKeyApi.testApiKey,
    onSuccess: (isValid) => {
      if (isValid) {
        toast.success('API 키 연결 테스트 성공!');
      } else {
        toast.error('API 키 연결 테스트 실패');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '연결 테스트에 실패했습니다.');
    },
  });
}

// API 키 검증 (등록 전)
export function useValidateApiKey() {
  return useMutation({
    mutationFn: apiKeyApi.validateApiKey,
  });
}

// Binance 거래 동기화
export function useSyncBinanceTrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tradeSyncApi.syncBinanceTrades,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      
      if (response.errors.length === 0) {
        toast.success(`동기화 완료: ${response.newTrades}개 거래 추가됨`);
      } else {
        toast.warning(
          `일부 동기화 실패: ${response.newTrades}개 추가, ${response.errors.length}개 오류`
        );
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '거래 동기화에 실패했습니다.');
    },
  });
}

// 빠른 동기화
export function useQuickSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tradeSyncApi.quickSync,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      toast.success(`최근 24시간 동기화 완료: ${response.newTrades}개 거래 추가됨`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '빠른 동기화에 실패했습니다.');
    },
  });
}