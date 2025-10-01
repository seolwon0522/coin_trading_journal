'use client';

import { useOrderbook } from '@/providers/unified-websocket-provider';
import { cn } from '@/lib/utils';
import { formatPrice, formatQuantity, formatCompact } from '@/lib/format';
import {
  Loader2,
  WifiOff,
  ArrowUp,
  ArrowDown,
  Zap,
  Settings,
  Maximize2
} from 'lucide-react';
import { useMemo, memo, useState, useCallback, useRef, useEffect } from 'react';

interface BinanceOrderBookProps {
  symbol: string;
  limit?: number;
}

// Binance 스타일 호가창
export const BinanceOrderBook = memo(function BinanceOrderBook({
  symbol,
  limit = 20
}: BinanceOrderBookProps) {
  const { orderbook, bids, asks, isConnected, hasData } = useOrderbook(symbol, limit);
  const [depthLevel, setDepthLevel] = useState<'0.01' | '0.1' | '1' | '10'>('0.01');
  const [flashItems, setFlashItems] = useState<Map<string, 'up' | 'down'>>(new Map());
  const prevBids = useRef(bids);
  const prevAsks = useRef(asks);

  // 오더북 객체 생성 (호환성)
  const orderBook = useMemo(() => ({
    bids: bids.map(([price, quantity]: string[], index: number) => ({
      price,
      quantity,
      total: bids.slice(0, index + 1).reduce((sum: number, [_, qty]: string[]) => sum + parseFloat(qty), 0),
    })),
    asks: asks.map(([price, quantity]: string[], index: number) => ({
      price,
      quantity,
      total: asks.slice(0, index + 1).reduce((sum: number, [_, qty]: string[]) => sum + parseFloat(qty), 0),
    })),
  }), [bids, asks]);

  // 최대 누적 거래량 계산
  const maxTotal = useMemo(() => {
    return Math.max(
      ...orderBook.bids.slice(0, limit).map((b: any) => b.total || 0),
      ...orderBook.asks.slice(0, limit).map((a: any) => a.total || 0)
    );
  }, [orderBook, limit]);

  // 스프레드 계산
  const spread = useMemo(() => {
    if (orderBook.bids.length > 0 && orderBook.asks.length > 0) {
      const bestBid = parseFloat(orderBook.bids[0].price);
      const bestAsk = parseFloat(orderBook.asks[0].price);
      const spreadValue = bestAsk - bestBid;
      const spreadPercent = (spreadValue / bestAsk) * 100;
      return { value: spreadValue, percent: spreadPercent };
    }
    return { value: 0, percent: 0 };
  }, [orderBook]);

  // 가격 변화 감지 및 플래시 효과
  useEffect(() => {
    if (!bids.length && !asks.length) return;
    
    const newFlashItems = new Map<string, 'up' | 'down'>();

    // Bids 비교
    orderBook.bids.forEach((bid: any, index: number) => {
      const prevBid = prevBids.current[index];
      if (prevBid && prevBid[1] !== bid.quantity) {
        const isUp = parseFloat(bid.quantity) > parseFloat(prevBid[1]);
        newFlashItems.set(`bid-${index}`, isUp ? 'up' : 'down');
      }
    });

    // Asks 비교
    orderBook.asks.forEach((ask: any, index: number) => {
      const prevAsk = prevAsks.current[index];
      if (prevAsk && prevAsk[1] !== ask.quantity) {
        const isUp = parseFloat(ask.quantity) > parseFloat(prevAsk[1]);
        newFlashItems.set(`ask-${index}`, isUp ? 'up' : 'down');
      }
    });

    if (newFlashItems.size > 0) {
      setFlashItems(newFlashItems);
      setTimeout(() => setFlashItems(new Map()), 300);
    }

    prevBids.current = bids;
    prevAsks.current = asks;
  }, [bids, asks, orderBook]);

  // 연결 안 됨
  if (!isConnected) {
    return (
      <div className="h-full bg-[#161a1e] flex flex-col items-center justify-center">
        <WifiOff className="h-5 w-5 text-[#5e6673] mb-2" />
        <p className="text-xs text-[#5e6673]">연결 중...</p>
      </div>
    );
  }

  // 데이터 로딩 중
  if (isConnected && !hasData) {
    return (
      <div className="h-full bg-[#161a1e] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-[#5e6673]" />
        <p className="text-xs text-[#5e6673]">호가 데이터 로딩 중...</p>
      </div>
    );
  }

  // 데이터 없음
  if (!bids.length && !asks.length) {
    return (
      <div className="h-full bg-[#161a1e] flex flex-col items-center justify-center gap-2">
        <WifiOff className="h-5 w-5 text-[#5e6673]" />
        <p className="text-xs text-[#5e6673]">호가 데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#161a1e] flex flex-col">
      {/* 헤더 */}
      <div className="h-8 px-2 flex items-center justify-between border-b border-[#2b3139]">
        <span className="text-xs font-medium text-[#eaecef]">호가창</span>
        <div className="flex items-center gap-2">
          {/* 깊이 선택기 */}
          <div className="flex items-center gap-0.5 bg-[#2b3139] rounded px-1 py-0.5">
            {(['0.01', '0.1', '1', '10'] as const).map(level => (
              <button
                key={level}
                onClick={() => setDepthLevel(level)}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-medium rounded transition-all",
                  depthLevel === level
                    ? "bg-[#474d57] text-[#eaecef]"
                    : "text-[#848e9c] hover:text-[#eaecef]"
                )}
              >
                {level}
              </button>
            ))}
          </div>

          {/* 설정 & 전체화면 */}
          <button className="p-0.5 hover:bg-[#2b3139] rounded">
            <Settings className="h-3 w-3 text-[#5e6673]" />
          </button>
          <button className="p-0.5 hover:bg-[#2b3139] rounded">
            <Maximize2 className="h-3 w-3 text-[#5e6673]" />
          </button>

          {/* 연결 상태 */}
          {isConnected ? (
            <div className="h-2 w-2 bg-[#0ecb81] rounded-full animate-pulse" />
          ) : (
            <div className="h-2 w-2 bg-[#f6465d] rounded-full" />
          )}
        </div>
      </div>

      {/* 컬럼 헤더 */}
      <div className="h-6 px-2 flex items-center text-[10px] text-[#848e9c] border-b border-[#2b3139]">
        <div className="flex-1">가격(USDT)</div>
        <div className="flex-1 text-right">수량({symbol.replace('USDT', '')})</div>
        <div className="flex-1 text-right">총액(USDT)</div>
      </div>

      {/* 호가 데이터 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 매도 호가 (역순 표시) */}
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col-reverse h-full overflow-y-auto binance-scrollbar">
            {orderBook.asks.slice(0, limit).reverse().map((ask: any, index: number) => {
              const actualIndex = limit - 1 - index;
              const depthPercent = ((ask.total || 0) / maxTotal) * 100;
              const flashClass = flashItems.get(`ask-${actualIndex}`);

              return (
                <div
                  key={`ask-${actualIndex}`}
                  className={cn(
                    "relative h-5 flex items-center px-2 hover:bg-[#1e2024] transition-all cursor-pointer",
                    flashClass === 'up' && "price-flash-up",
                    flashClass === 'down' && "price-flash-down"
                  )}
                >
                  {/* 깊이 바 */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent to-[#f6465d]/10"
                    style={{
                      width: `${Math.min(depthPercent, 100)}%`,
                      right: 0,
                      left: 'auto'
                    }}
                  />
                  {/* 데이터 */}
                  <div className="relative flex items-center justify-between w-full text-[11px] tabular-nums">
                    <span className="text-[#f6465d] font-medium">
                      {formatPrice(ask.price)}
                    </span>
                    <span className="text-[#eaecef]">
                      {formatCompact(ask.quantity)}
                    </span>
                    <span className="text-[#848e9c]">
                      {formatCompact(ask.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 스프레드 정보 */}
        <div className="h-8 px-2 flex items-center justify-between bg-[#1e2024] border-y border-[#2b3139]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#0ecb81]">
              {orderBook.bids[0] ? formatPrice(orderBook.bids[0].price) : '-'}
            </span>
            <ArrowUp className="h-3 w-3 text-[#0ecb81]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#848e9c]">스프레드</span>
            <span className="text-[10px] text-[#eaecef] font-medium">
              {spread.value.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#848e9c]">
              ({spread.percent.toFixed(3)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDown className="h-3 w-3 text-[#f6465d]" />
            <span className="text-xs font-medium text-[#f6465d]">
              {orderBook.asks[0] ? formatPrice(orderBook.asks[0].price) : '-'}
            </span>
          </div>
        </div>

        {/* 매수 호가 */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto binance-scrollbar">
            {orderBook.bids.slice(0, limit).map((bid: any, index: number) => {
              const depthPercent = ((bid.total || 0) / maxTotal) * 100;
              const flashClass = flashItems.get(`bid-${index}`);

              return (
                <div
                  key={`bid-${index}`}
                  className={cn(
                    "relative h-5 flex items-center px-2 hover:bg-[#1e2024] transition-all cursor-pointer",
                    flashClass === 'up' && "price-flash-up",
                    flashClass === 'down' && "price-flash-down"
                  )}
                >
                  {/* 깊이 바 */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-l from-transparent to-[#0ecb81]/10"
                    style={{ width: `${Math.min(depthPercent, 100)}%` }}
                  />
                  {/* 데이터 */}
                  <div className="relative flex items-center justify-between w-full text-[11px] tabular-nums">
                    <span className="text-[#0ecb81] font-medium">
                      {formatPrice(bid.price)}
                    </span>
                    <span className="text-[#eaecef]">
                      {formatCompact(bid.quantity)}
                    </span>
                    <span className="text-[#848e9c]">
                      {formatCompact(bid.total || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});