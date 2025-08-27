import { useState, useEffect, useCallback } from 'react';
import { tradeApi } from '@/lib/api/trade-api';
import { Trade, TradeRequest } from '@/types/trade';
import { ApiError, isApiError, extractErrorMessage } from '@/types/api-error';
import { toast } from 'sonner';

/**
 * 거래 데이터 관리 커스텀 훅
 * 
 * @description 거래 CRUD 작업과 상태 관리를 담당하는 커스텀 훅
 * @returns 거래 목록, 로딩 상태, 에러, CRUD 함수들
 */
export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // 거래 목록 로드
  const loadTrades = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tradeApi.list(pageNum);
      setTrades(response.content);
      setPage(response.number);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      
      // 401 인증 에러는 조용히 처리 (메인 페이지 등에서 로그인 전 접근)
      if (apiError.response?.status === 401) {
        console.log('로그인이 필요한 기능입니다.');
        setTrades([]);
        setTotalPages(0);
        setTotalElements(0);
      } else {
        const message = extractErrorMessage(err);
        setError(message);
        // 401, 403이 아닌 경우에만 toast 표시
        if (!apiError.response || (apiError.response.status !== 401 && apiError.response.status !== 403)) {
          toast.error(message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 거래 생성
   * @param data 생성할 거래 데이터
   * @returns 생성된 거래 객체
   */
  const createTrade = async (data: TradeRequest) => {
    try {
      const newTrade = await tradeApi.create(data);
      await loadTrades(page); // 목록 새로고침
      toast.success('거래가 등록되었습니다');
      return newTrade;
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      toast.error(message);
      throw err;
    }
  };

  /**
   * 거래 수정
   * @param id 수정할 거래 ID
   * @param data 수정할 거래 데이터
   * @returns 수정된 거래 객체
   */
  const updateTrade = async (id: number, data: TradeRequest) => {
    try {
      const updatedTrade = await tradeApi.update(id, data);
      await loadTrades(page); // 목록 새로고침
      toast.success('거래가 수정되었습니다');
      return updatedTrade;
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      toast.error(message);
      throw err;
    }
  };

  /**
   * 거래 삭제
   * @param id 삭제할 거래 ID
   */
  const deleteTrade = async (id: number) => {
    try {
      await tradeApi.delete(id);
      await loadTrades(page); // 목록 새로고침
      toast.success('거래가 삭제되었습니다');
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      toast.error(message);
      throw err;
    }
  };

  // 페이지 변경
  const changePage = (newPage: number) => {
    loadTrades(newPage);
  };

  // 새로고침
  const refresh = () => {
    loadTrades(page);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadTrades();
  }, []);

  return {
    trades,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    createTrade,
    updateTrade,
    deleteTrade,
    changePage,
    refresh
  };
}