import { useState, useEffect, useCallback } from 'react';
import { tradeApi } from '@/lib/api/trade-api';
import { Trade, TradeRequest } from '@/types/trade';
import { toast } from 'sonner';

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
    } catch (err: any) {
      // 401 인증 에러는 조용히 처리 (메인 페이지 등에서 로그인 전 접근)
      if (err.response?.status === 401) {
        console.log('로그인이 필요한 기능입니다.');
        setTrades([]);
        setTotalPages(0);
        setTotalElements(0);
      } else {
        const message = err instanceof Error ? err.message : '거래 목록을 불러올 수 없습니다';
        setError(message);
        // 401이 아닌 경우에만 toast 표시
        if (!err.response || err.response.status !== 403) {
          toast.error(message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 거래 생성
  const createTrade = async (data: TradeRequest) => {
    try {
      const newTrade = await tradeApi.create(data);
      await loadTrades(page); // 목록 새로고침
      toast.success('거래가 등록되었습니다');
      return newTrade;
    } catch (err) {
      const message = err instanceof Error ? err.message : '거래 등록에 실패했습니다';
      toast.error(message);
      throw err;
    }
  };

  // 거래 수정
  const updateTrade = async (id: number, data: TradeRequest) => {
    try {
      const updatedTrade = await tradeApi.update(id, data);
      await loadTrades(page); // 목록 새로고침
      toast.success('거래가 수정되었습니다');
      return updatedTrade;
    } catch (err) {
      const message = err instanceof Error ? err.message : '거래 수정에 실패했습니다';
      toast.error(message);
      throw err;
    }
  };

  // 거래 삭제
  const deleteTrade = async (id: number) => {
    try {
      await tradeApi.delete(id);
      await loadTrades(page); // 목록 새로고침
      toast.success('거래가 삭제되었습니다');
    } catch (err) {
      const message = err instanceof Error ? err.message : '거래 삭제에 실패했습니다';
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