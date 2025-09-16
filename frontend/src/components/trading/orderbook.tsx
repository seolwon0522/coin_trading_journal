'use client';

import { useBinanceOrderBook } from '@/hooks/use-binance-orderbook';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2, WifiOff, Wifi } from 'lucide-react';

interface OrderBookProps {
  symbol: string;
  limit?: number;
}

export function OrderBook({ symbol, limit = 20 }: OrderBookProps) {
  const { orderBook, isLoading, error, isConnected, isReconnecting } = useBinanceOrderBook(symbol, limit);

  const maxTotal = Math.max(
    ...orderBook.bids.map(b => b.total || 0),
    ...orderBook.asks.map(a => a.total || 0)
  );

  // 숫자를 K, M, B 단위로 변환하는 함수
  const formatWithUnit = (num: number, decimals: number = 2): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  // 천 단위 구분자 추가 함수
  const addCommas = (num: number, decimals: number): string => {
    return num.toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    // 가격은 전체 값을 표시 (천 단위 구분자 사용)
    if (num >= 10000) return addCommas(num, 0);
    if (num >= 100) return addCommas(num, 2);
    if (num >= 1) return addCommas(num, 4);
    return num.toFixed(8);
  };

  const formatQuantity = (quantity: string) => {
    const num = parseFloat(quantity);
    // 수량은 K, M 단위 사용
    if (num >= 10000) return formatWithUnit(num, 2);
    if (num >= 100) return num.toFixed(2);
    if (num >= 1) return num.toFixed(4);
    return num.toFixed(6);
  };

  if (isLoading) {
    return (
      <Card className="h-full p-4">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full p-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <WifiOff className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">호가창</h3>
        <div className="flex items-center gap-2">
          {isReconnecting ? (
            <div className="flex items-center gap-1 text-yellow-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">재연결 중</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center gap-1 text-green-500">
              <Wifi className="h-3 w-3" />
              <span className="text-xs">실시간</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-500">
              <WifiOff className="h-3 w-3" />
              <span className="text-xs">오프라인</span>
            </div>
          )}
        </div>
      </div>

      {/* Headers */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground">
          <span>가격</span>
          <span className="text-right">수량</span>
          <span className="text-right">총액</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground">
          <span>가격</span>
          <span className="text-right">수량</span>
          <span className="text-right">총액</span>
        </div>
      </div>

      {/* Order Book Content */}
      <div className="grid grid-cols-2 gap-4 h-[calc(100%-120px)] overflow-hidden">
        {/* Bids */}
        <div className="space-y-0.5 overflow-y-auto custom-scrollbar">
          {orderBook.bids.map((bid, index) => {
            const depthPercent = ((bid.total || 0) / maxTotal) * 100;
            return (
              <div
                key={`bid-${bid.price}-${index}`}
                className="relative grid grid-cols-3 gap-2 text-sm pr-1 hover:bg-muted/20"
              >
                <div
                  className="absolute inset-0 bg-green-500 opacity-10"
                  style={{ width: `${depthPercent}%` }}
                />
                <span className="relative text-green-500 font-medium truncate" title={bid.price}>
                  {formatPrice(bid.price)}
                </span>
                <span className="relative text-right truncate" title={bid.quantity}>
                  {formatQuantity(bid.quantity)}
                </span>
                <span className="relative text-right text-muted-foreground truncate" title={bid.total?.toString() || '0'}>
                  {formatQuantity(bid.total?.toString() || '0')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Asks */}
        <div className="space-y-0.5 overflow-y-auto custom-scrollbar">
          {orderBook.asks.map((ask, index) => {
            const depthPercent = ((ask.total || 0) / maxTotal) * 100;
            return (
              <div
                key={`ask-${ask.price}-${index}`}
                className="relative grid grid-cols-3 gap-2 text-sm pr-1 hover:bg-muted/20"
              >
                <div
                  className="absolute inset-0 bg-red-500 opacity-10"
                  style={{ width: `${depthPercent}%` }}
                />
                <span className="relative text-red-500 font-medium truncate" title={ask.price}>
                  {formatPrice(ask.price)}
                </span>
                <span className="relative text-right truncate" title={ask.quantity}>
                  {formatQuantity(ask.quantity)}
                </span>
                <span className="relative text-right text-muted-foreground truncate" title={ask.total?.toString() || '0'}>
                  {formatQuantity(ask.total?.toString() || '0')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spread */}
      <div className="mt-2 pt-2 border-t">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">스프레드</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {orderBook.spread.toFixed(8)}
            </span>
            <span className={cn(
              "text-muted-foreground",
              orderBook.spreadPercent > 0.5 && "text-yellow-500"
            )}>
              ({orderBook.spreadPercent.toFixed(3)}%)
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.3);
        }
      `}</style>
    </Card>
  );
}