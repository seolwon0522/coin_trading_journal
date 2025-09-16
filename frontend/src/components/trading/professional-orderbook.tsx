'use client';

import { useBinanceOrderBook } from '@/hooks/use-binance-orderbook';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatPrice, formatQuantity, formatCompact, getPriceColorClass } from '@/lib/format';
import { Loader2, WifiOff, Wifi, TrendingUp, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';

interface ProfessionalOrderBookProps {
  symbol: string;
  limit?: number;
}

export function ProfessionalOrderBook({ symbol, limit = 25 }: ProfessionalOrderBookProps) {
  const { orderBook, isLoading, error, isConnected, isReconnecting } = useBinanceOrderBook(symbol, limit);

  // 최대값 계산 (깊이 표시용)
  const maxTotal = useMemo(() => {
    return Math.max(
      ...orderBook.bids.slice(0, limit).map(b => b.total || 0),
      ...orderBook.asks.slice(0, limit).map(a => a.total || 0)
    );
  }, [orderBook, limit]);

  // 중간 가격 계산
  const midPrice = useMemo(() => {
    if (orderBook.bids.length > 0 && orderBook.asks.length > 0) {
      const bestBid = parseFloat(orderBook.bids[0].price);
      const bestAsk = parseFloat(orderBook.asks[0].price);
      return (bestBid + bestAsk) / 2;
    }
    return 0;
  }, [orderBook]);

  if (isLoading) {
    return (
      <Card className="h-full bg-background/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full bg-background/50 backdrop-blur border-border/50">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <WifiOff className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-background/50 backdrop-blur border-border/50 p-0 overflow-hidden">
      {/* 헤더 */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">호가창</h3>
          <div className="flex items-center gap-2">
            {isReconnecting ? (
              <div className="flex items-center gap-1 text-yellow-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px]">재연결</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-1 text-emerald-500">
                <Wifi className="h-3 w-3" />
                <span className="text-[10px]">실시간</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <WifiOff className="h-3 w-3" />
                <span className="text-[10px]">오프라인</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-2 text-[11px] font-medium text-muted-foreground px-3 py-1.5 border-b border-border/50">
        <div className="grid grid-cols-3">
          <span>가격(USDT)</span>
          <span className="text-right">수량</span>
          <span className="text-right">총액</span>
        </div>
        <div className="grid grid-cols-3">
          <span>가격(USDT)</span>
          <span className="text-right">수량</span>
          <span className="text-right">총액</span>
        </div>
      </div>

      {/* 호가 데이터 */}
      <div className="flex flex-col h-[calc(100%-100px)]">
        <div className="grid grid-cols-2 flex-1 overflow-hidden">
          {/* 매수 호가 */}
          <div className="border-r border-border/50 overflow-y-auto scrollbar-thin">
            {orderBook.bids.slice(0, limit).map((bid, index) => {
              const depthPercent = ((bid.total || 0) / maxTotal) * 100;
              return (
                <div
                  key={`bid-${index}`}
                  className="relative hover:bg-emerald-500/5 transition-colors"
                >
                  <div
                    className="absolute inset-0 bg-emerald-500/10"
                    style={{ width: `${depthPercent}%` }}
                  />
                  <div className="relative grid grid-cols-3 px-3 py-[3px] text-[11px]">
                    <span className="text-emerald-500 font-medium">
                      {formatPrice(bid.price)}
                    </span>
                    <span className="text-right text-gray-300">
                      {formatCompact(bid.quantity)}
                    </span>
                    <span className="text-right text-gray-500">
                      {formatCompact(bid.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 매도 호가 */}
          <div className="overflow-y-auto scrollbar-thin">
            {orderBook.asks.slice(0, limit).map((ask, index) => {
              const depthPercent = ((ask.total || 0) / maxTotal) * 100;
              return (
                <div
                  key={`ask-${index}`}
                  className="relative hover:bg-red-500/5 transition-colors"
                >
                  <div
                    className="absolute inset-0 bg-red-500/10"
                    style={{ width: `${depthPercent}%` }}
                  />
                  <div className="relative grid grid-cols-3 px-3 py-[3px] text-[11px]">
                    <span className="text-red-500 font-medium">
                      {formatPrice(ask.price)}
                    </span>
                    <span className="text-right text-gray-300">
                      {formatCompact(ask.quantity)}
                    </span>
                    <span className="text-right text-gray-500">
                      {formatCompact(ask.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 스프레드 정보 */}
        <div className="border-t border-border/50 px-3 py-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">스프레드</span>
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-300">
                {formatPrice(orderBook.spread)}
              </span>
              <span className={cn(
                "font-medium",
                orderBook.spreadPercent > 0.5 ? "text-yellow-500" : "text-gray-500"
              )}>
                ({orderBook.spreadPercent.toFixed(3)}%)
              </span>
            </div>
          </div>
          {midPrice > 0 && (
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-muted-foreground">중간가</span>
              <span className="font-medium text-gray-300">
                {formatPrice(midPrice)}
              </span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </Card>
  );
}