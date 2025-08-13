import { useQuery } from '@tanstack/react-query';
import { coinApi, binanceApi } from '@/lib/api/coin-api';

// 쿼리 키 상수 정의
export const QUERY_KEYS = {
  COIN_PRICE: 'coinPrice',
  HISTORICAL_PRICE: 'historicalPrice',
} as const;

// 기존 비트코인 가격 훅
export function useCoinPrice() {
  return useQuery({
    queryKey: ['coin-price'],
    queryFn: coinApi.getCurrentPrice,
    refetchInterval: 30000, // 30초마다 자동 새로고침
  });
}

// 바이낸스 거래소 정보 (사용 가능한 코인 목록) 훅
export function useBinanceExchangeInfo() {
  return useQuery({
    queryKey: ['binance-exchange-info'],
    queryFn: binanceApi.getExchangeInfo,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 대기
  });
}

// 특정 코인의 바이낸스 가격 정보 훅
export function useBinanceTickerPrice(symbol: string) {
  return useQuery({
    queryKey: ['binance-ticker-price', symbol],
    queryFn: () => binanceApi.getTickerPrice(symbol),
    enabled: !!symbol, // symbol이 있을 때만 실행
    refetchInterval: 10000, // 10초마다 자동 새로고침
    staleTime: 5000, // 5초간 캐시 유지
  });
}

// 모든 코인의 바이낸스 가격 정보 훅
export function useAllBinanceTickerPrices() {
  return useQuery({
    queryKey: ['all-binance-ticker-prices'],
    queryFn: binanceApi.getAllTickerPrices,
    refetchInterval: 30000, // 30초마다 자동 새로고침
    staleTime: 10000, // 10초간 캐시 유지
  });
}

// 과거 비트코인 가격 정보를 가져오는 hook
export function useHistoricalCoinPrice(date: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.HISTORICAL_PRICE, date],
    queryFn: () => coinApi.getHistoricalPrice(date),
    enabled: !!date, // date가 있을 때만 쿼리 실행
    staleTime: 24 * 60 * 60 * 1000, // 24시간 - 과거 데이터는 변하지 않으므로 길게 설정
    retry: 2,
  });
}
