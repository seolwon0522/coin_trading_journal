import { useState, useEffect, useCallback } from 'react';
import { tradesApi, Trade, PageResponse } from '@/lib/api/trades-api';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 거래 목록 조회
  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await tradesApi.getTrades(page, size);
      setTrades(response.content);
      setTotalElements(response.totalElements);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trades');
      console.error('Error fetching trades:', err);
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  // 거래 생성
  const createTrade = async (trade: Trade) => {
    setError(null);
    
    try {
      const newTrade = await tradesApi.createTrade(trade);
      await fetchTrades(); // 목록 새로고침
      return newTrade;
    } catch (err: any) {
      setError(err.message || 'Failed to create trade');
      throw err;
    }
  };

  // 거래 수정
  const updateTrade = async (id: number, trade: Trade) => {
    setError(null);
    
    try {
      const updatedTrade = await tradesApi.updateTrade(id, trade);
      await fetchTrades(); // 목록 새로고침
      return updatedTrade;
    } catch (err: any) {
      setError(err.message || 'Failed to update trade');
      throw err;
    }
  };

  // 거래 삭제
  const deleteTrade = async (id: number) => {
    setError(null);
    
    try {
      await tradesApi.deleteTrade(id);
      await fetchTrades(); // 목록 새로고침
    } catch (err: any) {
      setError(err.message || 'Failed to delete trade');
      throw err;
    }
  };

  // 페이지 변경
  const changePage = (newPage: number) => {
    setPage(newPage);
  };

  // 페이지 크기 변경
  const changeSize = (newSize: number) => {
    setSize(newSize);
    setPage(0); // 페이지 크기 변경 시 첫 페이지로
  };

  // 페이지 변경 시 자동 조회
  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  return {
    trades,
    loading,
    error,
    page,
    size,
    totalElements,
    totalPages,
    refresh: fetchTrades,
    createTrade,
    updateTrade,
    deleteTrade,
    changePage,
    changeSize,
  };
}