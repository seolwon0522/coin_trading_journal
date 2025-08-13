import { QueryClient } from '@tanstack/react-query';

// React Query 클라이언트 설정
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분 - 데이터가 fresh 상태를 유지하는 시간
      retry: 1, // 실패 시 재시도 횟수
      refetchOnWindowFocus: false, // 창 포커스 시 자동 refetch 비활성화
    },
    mutations: {
      retry: 1, // mutation 실패 시 재시도 횟수
    },
  },
});
