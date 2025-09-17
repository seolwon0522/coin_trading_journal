'use client';

import { useState, useEffect } from 'react';
import { BinanceApi, Ticker24hr } from '@/lib/api/binance-api';
import { toast } from 'sonner';

// API 인스턴스는 싱글톤으로 관리
const binanceApi = new BinanceApi();

// 업데이트 간격 상수
const TICKER_UPDATE_INTERVAL = 3000; // 3초

interface UseTickerOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function useTicker(symbol: string, options: UseTickerOptions = {}) {
  const { enabled = true, onError } = options;
  const [ticker, setTicker] = useState<Ticker24hr | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!symbol || !enabled) {
      setTicker(null);
      setIsLoading(false);
      return;
    }

    let intervalId: NodeJS.Timeout;

    const fetchTicker = async () => {
      try {
        setIsLoading(true);
        const data = await binanceApi.get24hrTicker(symbol);
        setTicker(data);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('티커 데이터를 가져오는데 실패했습니다');
        setError(error);

        // 에러 콜백 실행
        if (onError) {
          onError(error);
        } else {
          // 기본 에러 처리 - 첫 번째 에러만 토스트로 표시
          if (!ticker) {
            toast.error('시세 정보 로드 실패', {
              description: error.message,
            });
          }
        }

        console.error('Failed to fetch ticker:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 초기 페치
    fetchTicker();

    // 주기적 업데이트
    intervalId = setInterval(fetchTicker, TICKER_UPDATE_INTERVAL);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [symbol, enabled, onError]);

  // 유용한 계산된 값들
  const currentPrice = ticker ? parseFloat(ticker.lastPrice) : 0;
  const priceChange = ticker ? parseFloat(ticker.priceChange) : 0;
  const priceChangePercent = ticker ? parseFloat(ticker.priceChangePercent) : 0;
  const volume = ticker ? parseFloat(ticker.volume) : 0;
  const quoteVolume = ticker ? parseFloat(ticker.quoteVolume) : 0;

  return {
    ticker,
    isLoading,
    error,
    currentPrice,
    priceChange,
    priceChangePercent,
    volume,
    quoteVolume,
  };
}