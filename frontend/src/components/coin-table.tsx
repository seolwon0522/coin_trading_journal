'use client';

import { useState } from 'react';
import { Star, StarOff, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPrice, formatVolume, formatPercent } from '@/lib/format';

// 정렬 타입 정의
export type SortField = 'symbol' | 'price' | 'change' | 'volume';
export type SortDirection = 'asc' | 'desc';

// 코인 데이터 타입
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

interface CoinTableProps {
  coins: CoinData[];
  favorites: Set<string>;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onToggleFavorite: (symbol: string) => void;
  onRowClick: (symbol: string) => void;
}

export function CoinTable({
  coins,
  favorites,
  sortField,
  sortDirection,
  onSort,
  onToggleFavorite,
  onRowClick,
}: CoinTableProps) {
  // 가격 변화율 색상
  const getPriceChangeColor = (changePercent: string) => {
    const change = parseFloat(changePercent);
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  // 정렬 아이콘 표시
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="bg-muted/50">
              <TableHead className="w-12"></TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70"
                onClick={() => onSort('symbol')}
              >
                <div className="flex items-center gap-1">
                  심볼
                  {renderSortIcon('symbol')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70"
                onClick={() => onSort('price')}
              >
                <div className="flex items-center gap-1">
                  최종가
                  {renderSortIcon('price')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70"
                onClick={() => onSort('change')}
              >
                <div className="flex items-center gap-1">
                  24시간 변동
                  {renderSortIcon('change')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/70"
                onClick={() => onSort('volume')}
              >
                <div className="flex items-center gap-1">
                  24시간 거래대금
                  {renderSortIcon('volume')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {coins.map((coin) => (
              <TableRow
                key={coin.symbol}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => onRowClick(coin.symbol)}
              >
                <TableCell>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(coin.symbol);
                    }}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {favorites.has(coin.symbol) ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </TableCell>

                <TableCell>
                  <div>
                    <div className="font-medium">{coin.baseAsset}</div>
                    <div className="text-xs text-muted-foreground">{coin.koreanName}</div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-mono">${formatPrice(coin.price)}</div>
                </TableCell>

                <TableCell>
                  <div className={`font-mono ${getPriceChangeColor(coin.priceChangePercent)}`}>
                    {formatPercent(coin.priceChangePercent)}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm">{formatVolume(coin.quoteVolume)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}