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
    <Card className="h-full bg-transparent border-0 p-0 overflow-hidden">
      {/* 헤더 */}
      <div className="px-2 py-1.5 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-normal text-gray-400">호가창</h3>
          <div className="flex items-center gap-2">
            {isReconnecting ? (
              <div className="flex items-center gap-1 text-yellow-500">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                <span className="text-[9px]">재연결</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-0.5 text-emerald-500">
                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px]">실시간</span>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 text-red-500">
                <div className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                <span className="text-[9px]">오프라인</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-2 text-[10px] font-normal text-gray-500 px-2 py-1 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="grid grid-cols-3">
          <span>가격</span>
          <span className="text-right">수량</span>
          <span className="text-right">총액</span>
        </div>
        <div className="grid grid-cols-3">
          <span>가격</span>
          <span className="text-right">수량</span>
          <span className="text-right">총액</span>
        </div>
      </div>

      {/* 호가 데이터 */}
      <div className="flex flex-col h-[calc(100%-100px)]">
        <div className="grid grid-cols-2 flex-1 overflow-hidden">
          {/* 매수 호가 */}
          <div className="border-r border-[#2a2a2a] overflow-y-auto scrollbar-thin bg-[#161616]">
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
                  <div className="relative grid grid-cols-3 px-2 py-0.5 text-[10px]">
                    <span className="text-emerald-400 font-medium tabular-nums">
                      {formatPrice(bid.price)}
                    </span>
                    <span className="text-right text-gray-400 tabular-nums">
                      {formatCompact(bid.quantity)}
                    </span>
                    <span className="text-right text-gray-500 tabular-nums">
                      {formatCompact(bid.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 매도 호가 */}
          <div className="overflow-y-auto scrollbar-thin bg-[#161616]">
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
                  <div className="relative grid grid-cols-3 px-2 py-0.5 text-[10px]">
                    <span className="text-red-400 font-medium tabular-nums">
                      {formatPrice(ask.price)}
                    </span>
                    <span className="text-right text-gray-400 tabular-nums">
                      {formatCompact(ask.quantity)}
                    </span>
                    <span className="text-right text-gray-500 tabular-nums">
                      {formatCompact(ask.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 스프레드 정보 */}
        <div className="border-t border-[#2a2a2a] px-2 py-1.5 bg-[#1a1a1a]">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-gray-500">스프레드</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 tabular-nums">
                {formatPrice(orderBook.spread)}
              </span>
              <span className={cn(
                "tabular-nums",
                orderBook.spreadPercent > 0.5 ? "text-yellow-500" : "text-gray-500"
              )}>
                ({orderBook.spreadPercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          {midPrice > 0 && (
            <div className="flex items-center justify-between text-[9px] mt-0.5">
              <span className="text-gray-500">중간가</span>
              <span className="text-gray-400 tabular-nums">
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