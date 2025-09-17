'use client';

import { useMemo } from 'react';
import { getCoinCategory } from '@/constants/coin-names';

// 정렬 타입
export type SortField = 'symbol' | 'price' | 'change' | 'volume';
export type SortDirection = 'asc' | 'desc';

// 코인 데이터 인터페이스
export interface CoinData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  koreanName: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
  category: string;
}

interface UseCoinFilterOptions {
  exchangeInfo?: any;
  tickerData?: any[];
  searchTerm: string;
  selectedCategory: string;
  sortField: SortField;
  sortDirection: SortDirection;
  coinNames: Record<string, string>;
}

export function useCoinFilter({
  exchangeInfo,
  tickerData,
  searchTerm,
  selectedCategory,
  sortField,
  sortDirection,
  coinNames,
}: UseCoinFilterOptions) {
  return useMemo(() => {
    if (!exchangeInfo?.symbols || !tickerData) return [];

    // 1. USDT 페어만 필터링하고 티커 데이터와 매칭
    let coins: CoinData[] = exchangeInfo.symbols
      .filter(
        (symbol: any) =>
          symbol.status === 'TRADING' &&
          symbol.quoteAsset === 'USDT' &&
          symbol.isSpotTradingAllowed
      )
      .map((symbol: any) => {
        const ticker = tickerData.find((t: any) => t.symbol === symbol.symbol);
        return {
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          koreanName: coinNames[symbol.baseAsset] || symbol.baseAsset,
          price: ticker?.lastPrice || '0',
          priceChange: ticker?.priceChange || '0',
          priceChangePercent: ticker?.priceChangePercent || '0',
          volume: ticker?.volume || '0',
          quoteVolume: ticker?.quoteVolume || '0',
          highPrice: ticker?.highPrice || '0',
          lowPrice: ticker?.lowPrice || '0',
          category: getCoinCategory(symbol.symbol),
        };
      });

    // 2. 검색어 필터링
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      coins = coins.filter(
        (coin) =>
          coin.baseAsset.toLowerCase().includes(searchLower) ||
          coin.koreanName.toLowerCase().includes(searchLower)
      );
    }

    // 3. 카테고리 필터링
    if (selectedCategory !== 'All') {
      coins = coins.filter((coin) => coin.category === selectedCategory);
    }

    // 4. 정렬 적용
    coins.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'symbol':
          aValue = a.baseAsset;
          bValue = b.baseAsset;
          break;
        case 'price':
          aValue = parseFloat(a.price);
          bValue = parseFloat(b.price);
          break;
        case 'change':
          aValue = parseFloat(a.priceChangePercent);
          bValue = parseFloat(b.priceChangePercent);
          break;
        case 'volume':
          aValue = parseFloat(a.quoteVolume);
          bValue = parseFloat(b.quoteVolume);
          break;
        default:
          aValue = a.baseAsset;
          bValue = b.baseAsset;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // 5. 상위 100개만 반환 (성능 최적화)
    return coins.slice(0, 100);
  }, [
    exchangeInfo,
    tickerData,
    searchTerm,
    selectedCategory,
    sortField,
    sortDirection,
    coinNames,
  ]);
}