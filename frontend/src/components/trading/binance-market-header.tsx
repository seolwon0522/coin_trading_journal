'use client';

import { useEffect, useState, memo } from 'react';
import { formatPrice, formatVolume, formatPercent } from '@/lib/format';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Info,
  ChevronDown,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Ticker24hr } from '@/lib/api/binance-api';
import { binanceTheme } from '@/lib/binance-theme';

interface BinanceMarketHeaderProps {
  symbol: string;
  ticker: Ticker24hr | null;
  onSymbolChange?: (symbol: string) => void;
  onToggleMarketList?: () => void;
}

export const BinanceMarketHeader = memo(function BinanceMarketHeader({
  symbol,
  ticker,
  onSymbolChange,
  onToggleMarketList
}: BinanceMarketHeaderProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [prevPrice, setPrevPrice] = useState<string | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  // 가격 변화 감지 및 플래시 효과
  useEffect(() => {
    if (ticker && prevPrice && prevPrice !== ticker.lastPrice) {
      const isUp = parseFloat(ticker.lastPrice) > parseFloat(prevPrice);
      setPriceFlash(isUp ? 'up' : 'down');
      setTimeout(() => setPriceFlash(null), 300);
    }
    if (ticker) {
      setPrevPrice(ticker.lastPrice);
    }
  }, [ticker?.lastPrice]);

  // 즐겨찾기 상태 로드
  useEffect(() => {
    const favorites = localStorage.getItem('favorites');
    if (favorites) {
      const favList = JSON.parse(favorites);
      setIsFavorite(favList.includes(symbol));
    }
  }, [symbol]);

  const toggleFavorite = () => {
    const favorites = localStorage.getItem('favorites');
    let favList = favorites ? JSON.parse(favorites) : [];

    if (isFavorite) {
      favList = favList.filter((s: string) => s !== symbol);
    } else {
      favList.push(symbol);
    }

    localStorage.setItem('favorites', JSON.stringify(favList));
    setIsFavorite(!isFavorite);
  };

  if (!ticker) {
    return (
      <div className="h-12 bg-[#161a1e] border-b border-[#2b3139] flex items-center px-4">
        <div className="animate-pulse text-[#848e9c] text-xs">데이터 로딩 중...</div>
      </div>
    );
  }

  const priceChange = parseFloat(ticker.priceChangePercent);
  const isUp = priceChange > 0;
  const isDown = priceChange < 0;
  const priceColor = isUp ? '#0ecb81' : isDown ? '#f6465d' : '#848e9c';
  const baseSymbol = symbol.replace('USDT', '').replace('BUSD', '');

  return (
    <div className="h-12 bg-[#161a1e] border-b border-[#2b3139] flex items-center px-3">
      <div className="flex items-center justify-between w-full gap-4">
        {/* 왼쪽: 심볼 & 가격 정보 */}
        <div className="flex items-center gap-3">
          {/* 심볼 & 즐겨찾기 */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleFavorite}
              className="p-1 hover:bg-[#2b3139] rounded transition-colors"
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  isFavorite ? "fill-[#fcd535] text-[#fcd535]" : "text-[#5e6673]"
                )}
              />
            </button>
            <button
              onClick={onToggleMarketList}
              className="flex items-center gap-1 px-2 py-1 hover:bg-[#2b3139] rounded transition-colors">
              <span className="text-sm font-semibold text-[#eaecef]">{baseSymbol}</span>
              <span className="text-xs text-[#848e9c]">/USDT</span>
              <ChevronDown className="h-3 w-3 text-[#5e6673]" />
            </button>
          </div>

          {/* 현재 가격 */}
          <div className={cn(
            "flex items-center gap-2 px-2 py-1 rounded transition-all",
            priceFlash === 'up' && "bg-[#0ecb81]/10",
            priceFlash === 'down' && "bg-[#f6465d]/10"
          )}>
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: priceColor }}
            >
              {formatPrice(ticker.lastPrice)}
            </span>
            {isUp && <TrendingUp className="h-4 w-4 text-[#0ecb81]" />}
            {isDown && <TrendingDown className="h-4 w-4 text-[#f6465d]" />}
          </div>

          {/* 가격 변동 */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: priceColor }}
            >
              {priceChange > 0 ? '+' : ''}{ticker.priceChange}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-xs font-medium tabular-nums",
                isUp && "bg-[#0ecb81]/15 text-[#0ecb81]",
                isDown && "bg-[#f6465d]/15 text-[#f6465d]",
                !isUp && !isDown && "bg-[#848e9c]/15 text-[#848e9c]"
              )}
            >
              {formatPercent(ticker.priceChangePercent)}
            </span>
          </div>
        </div>

        {/* 중앙: 24시간 통계 */}
        <div className="flex items-center gap-6 flex-1">
          {/* 24h 고가 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#5e6673] leading-tight">24h 고가</span>
            <span className="text-xs font-medium text-[#eaecef] tabular-nums">
              {formatPrice(ticker.highPrice)}
            </span>
          </div>

          {/* 24h 저가 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#5e6673] leading-tight">24h 저가</span>
            <span className="text-xs font-medium text-[#eaecef] tabular-nums">
              {formatPrice(ticker.lowPrice)}
            </span>
          </div>

          {/* 24h 거래량 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#5e6673] leading-tight">
              24h 거래량({baseSymbol})
            </span>
            <span className="text-xs font-medium text-[#eaecef] tabular-nums">
              {formatVolume(ticker.volume)}
            </span>
          </div>

          {/* 24h 거래대금 */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#5e6673] leading-tight">
              24h 거래대금(USDT)
            </span>
            <span className="text-xs font-medium text-[#eaecef] tabular-nums">
              {formatVolume(ticker.quoteVolume)}
            </span>
          </div>

          {/* 거래량 순위 (더미 데이터) */}
          <div className="flex flex-col">
            <span className="text-[10px] text-[#5e6673] leading-tight">순위</span>
            <span className="text-xs font-medium text-[#fcd535]">#12</span>
          </div>
        </div>

        {/* 오른쪽: 상태 표시 */}
        <div className="flex items-center gap-3">
          {/* 실시간 상태 */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[#0ecb81]/10 rounded">
            <Activity className="h-3 w-3 text-[#0ecb81]" />
            <span className="text-[10px] text-[#0ecb81] font-medium">LIVE</span>
          </div>

          {/* 정보 아이콘 */}
          <button className="p-1 hover:bg-[#2b3139] rounded transition-colors">
            <Info className="h-3.5 w-3.5 text-[#5e6673]" />
          </button>
        </div>
      </div>

      {/* 가격 범위 인디케이터 (하단 얇은 바) */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#2b3139]">
        <div className="relative h-full">
          <div
            className="absolute h-full bg-gradient-to-r from-[#f6465d] to-[#0ecb81]"
            style={{
              left: '0%',
              width: '100%',
              opacity: 0.3
            }}
          />
          <div
            className="absolute w-1 h-2 bg-[#fcd535] -top-[3px]"
            style={{
              left: `${((parseFloat(ticker.lastPrice) - parseFloat(ticker.lowPrice)) /
                (parseFloat(ticker.highPrice) - parseFloat(ticker.lowPrice))) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      </div>
    </div>
  );
});