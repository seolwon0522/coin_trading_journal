'use client';

import { useEffect, useState } from 'react';
import { formatPrice, formatVolume, formatPercent, getPriceColorClass } from '@/lib/format';
import { TrendingUp, TrendingDown, Activity, BarChart3, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Ticker24hr } from '@/lib/api/binance-api';
import { SymbolSelector } from './symbol-selector';

interface MarketHeaderProps {
  symbol: string;
  ticker: Ticker24hr | null;
}

export function MarketHeader({ symbol, ticker }: MarketHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!ticker) {
    return (
      <div className="bg-background/95 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <SymbolSelector currentSymbol={symbol} />
            <div className="text-sm text-muted-foreground">데이터 로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  const priceChange = parseFloat(ticker.priceChangePercent);
  const priceChangeValue = parseFloat(ticker.priceChange);
  const isUp = priceChange > 0;
  const isDown = priceChange < 0;

  return (
    <div className="bg-background/95 backdrop-blur border-b border-border/50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-6">
          {/* 심볼 선택기 */}
          <div className="flex items-center gap-4">
            <SymbolSelector currentSymbol={symbol} className="text-lg font-bold" />

            {/* 현재 가격 */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-2xl font-bold",
                  getPriceColorClass(priceChange)
                )}>
                  {formatPrice(ticker.lastPrice)}
                </span>
                {isUp && <TrendingUp className="h-5 w-5 text-emerald-500" />}
                {isDown && <TrendingDown className="h-5 w-5 text-red-500" />}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={getPriceColorClass(priceChange)}>
                  {priceChangeValue > 0 ? '+' : ''}{formatPrice(priceChangeValue)}
                </span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-medium",
                  isUp ? "bg-emerald-500/20 text-emerald-500" :
                  isDown ? "bg-red-500/20 text-red-500" :
                  "bg-gray-500/20 text-gray-500"
                )}>
                  {formatPercent(ticker.priceChangePercent)}
                </span>
              </div>
            </div>
          </div>

          {/* 24시간 통계 */}
          <div className="flex items-center gap-6 flex-1">
            {/* 24h 고가 */}
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">24h 고가</span>
              <span className="text-sm font-medium">{formatPrice(ticker.highPrice)}</span>
            </div>

            {/* 24h 저가 */}
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">24h 저가</span>
              <span className="text-sm font-medium">{formatPrice(ticker.lowPrice)}</span>
            </div>

            {/* 24h 거래량 (코인) */}
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">24h 거래량</span>
              <span className="text-sm font-medium">
                {formatVolume(ticker.volume)}
                <span className="text-[10px] text-muted-foreground ml-1">
                  {symbol.replace('USDT', '').replace('BUSD', '')}
                </span>
              </span>
            </div>

            {/* 24h 거래대금 */}
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">24h 거래대금</span>
              <span className="text-sm font-medium">{formatVolume(ticker.quoteVolume)}</span>
            </div>
          </div>

          {/* 시간 및 상태 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 text-emerald-500" />
              <span>실시간</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {currentTime.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* 가격 범위 바 */}
        <div className="mt-2">
          <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-red-500 to-emerald-500"
              style={{
                left: `${((parseFloat(ticker.lowPrice) / parseFloat(ticker.highPrice)) * 100)}%`,
                width: `${((parseFloat(ticker.lastPrice) - parseFloat(ticker.lowPrice)) / (parseFloat(ticker.highPrice) - parseFloat(ticker.lowPrice))) * 100}%`
              }}
            />
            <div
              className="absolute w-2 h-2 bg-white rounded-full -top-0.5 transform -translate-x-1/2"
              style={{
                left: `${((parseFloat(ticker.lastPrice) - parseFloat(ticker.lowPrice)) / (parseFloat(ticker.highPrice) - parseFloat(ticker.lowPrice))) * 100}%`
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>저가: {formatPrice(ticker.lowPrice)}</span>
            <span className="text-white font-medium">현재: {formatPrice(ticker.lastPrice)}</span>
            <span>고가: {formatPrice(ticker.highPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}