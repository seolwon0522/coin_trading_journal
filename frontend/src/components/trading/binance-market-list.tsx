'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Search, Star, TrendingUp, Flame, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice, formatVolume, formatPercent } from '@/lib/format';
import { useAllMarketTickers } from '@/providers/unified-websocket-provider';
import { searchSymbols } from '@/lib/api/binance-api';

interface MarketItem {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
}

interface BinanceMarketListProps {
  onSelectSymbol: (symbol: string) => void;
  selectedSymbol?: string;
}

const CATEGORIES = [
  { id: 'favorites', label: '즐겨찾기', icon: Star },
  { id: 'hot', label: '🔥 HOT', icon: Flame },
  { id: 'gainers', label: '상승', icon: TrendingUp },
  { id: 'losers', label: '하락', icon: TrendingUp },
  { id: 'USDT', label: 'USDT', icon: null },
  { id: 'BTC', label: 'BTC', icon: null },
  { id: 'BUSD', label: 'BUSD', icon: null },
] as const;

const HOT_COINS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'MATICUSDT'];

export const BinanceMarketList = memo(function BinanceMarketList({
  onSelectSymbol,
  selectedSymbol
}: BinanceMarketListProps) {
  const [activeCategory, setActiveCategory] = useState<string>('USDT');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'volume' | 'change' | 'name'>('volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [initialData, setInitialData] = useState<Map<string, MarketItem>>(new Map());
  const [loading, setLoading] = useState(true);

  // Use unified WebSocket provider for real-time updates
  const { tickers, isConnected } = useAllMarketTickers();

  // Load initial data from REST API
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorites');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const symbols = await searchSymbols('', 10000);
      const dataMap = new Map<string, MarketItem>();
      symbols.forEach(s => {
        dataMap.set(s.symbol, {
          symbol: s.symbol,
          lastPrice: s.lastPrice,
          priceChangePercent: s.priceChangePercent,
          volume: s.volume,
          quoteVolume: s.quoteVolume,
        });
      });
      setInitialData(dataMap);
    } catch (error) {
      console.error('Failed to load initial market data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Merge initial data with WebSocket updates
  const mergedData = useMemo(() => {
    const merged = new Map(initialData);

    // Update with WebSocket data
    tickers.forEach((ticker, symbol) => {
      if (merged.has(symbol)) {
        merged.set(symbol, {
          symbol,
          lastPrice: ticker.c || '0',
          priceChangePercent: ticker.P || '0',
          volume: ticker.v || '0',
          quoteVolume: ticker.q || '0',
        });
      }
    });

    return merged;
  }, [initialData, tickers]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = Array.from(mergedData.values());

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toUpperCase();
      filtered = filtered.filter(item => item.symbol.includes(query));
    }

    // Category filter
    switch (activeCategory) {
      case 'favorites':
        filtered = filtered.filter(item => favorites.includes(item.symbol));
        break;
      case 'hot':
        filtered = filtered.filter(item => HOT_COINS.includes(item.symbol));
        break;
      case 'gainers':
        filtered = filtered
          .filter(item => parseFloat(item.priceChangePercent) > 0)
          .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
          .slice(0, 20);
        break;
      case 'losers':
        filtered = filtered
          .filter(item => parseFloat(item.priceChangePercent) < 0)
          .sort((a, b) => parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent))
          .slice(0, 20);
        break;
      case 'USDT':
      case 'BTC':
      case 'BUSD':
        filtered = filtered.filter(item => item.symbol.endsWith(activeCategory));
        break;
    }

    // Sort
    filtered.sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'name':
          return a.symbol.localeCompare(b.symbol) * order;
        case 'change':
          return (parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)) * order;
        case 'volume':
        default:
          return (parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)) * order;
      }
    });

    return filtered;
  }, [mergedData, searchQuery, activeCategory, favorites, sortBy, sortOrder]);

  const toggleFavorite = useCallback((symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(s => s !== symbol)
      : [...favorites, symbol];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  }, [favorites]);

  return (
    <div className="h-full bg-[#161a1e] flex flex-col">
      {/* Header with search */}
      <div className="flex-shrink-0">
        {showSearch ? (
          <div className="px-2 py-1.5 border-b border-[#2b3139]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5e6673]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색..."
                autoFocus
                className="w-full h-7 pl-8 pr-8 bg-[#2b3139] text-xs text-[#eaecef] placeholder-[#5e6673]
                         rounded focus:outline-none focus:ring-1 focus:ring-[#fcd535]"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[#474d57] rounded"
              >
                <X className="h-3 w-3 text-[#5e6673]" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-2 py-1 border-b border-[#2b3139]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#eaecef]">마켓</span>
              <button
                onClick={() => setShowSearch(true)}
                className="p-1 hover:bg-[#2b3139] rounded"
              >
                <Search className="h-3.5 w-3.5 text-[#5e6673]" />
              </button>
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div className="px-1 py-1 flex gap-0.5 overflow-x-auto binance-scrollbar border-b border-[#2b3139]">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-2 py-1 text-[11px] font-medium whitespace-nowrap rounded transition-all",
                activeCategory === cat.id
                  ? "bg-[#2b3139] text-[#fcd535]"
                  : "text-[#848e9c] hover:text-[#eaecef]"
              )}
            >
              {cat.icon && <cat.icon className="inline h-3 w-3 mr-1" />}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div className="px-2 py-1 flex items-center text-[10px] text-[#5e6673] border-b border-[#2b3139]">
          <button
            onClick={() => {
              setSortBy('name');
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
            className="flex-1 text-left hover:text-[#848e9c] transition-colors"
          >
            이름
          </button>
          <div className="flex-1 text-right">가격</div>
          <button
            onClick={() => {
              setSortBy('change');
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
            className="w-16 text-right hover:text-[#848e9c] transition-colors"
          >
            24h %
          </button>
          <button
            onClick={() => {
              setSortBy('volume');
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
            className="w-20 text-right hover:text-[#848e9c] transition-colors"
          >
            거래량
          </button>
        </div>
      </div>

      {/* Market list */}
      <div className="flex-1 overflow-y-auto binance-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-[#5e6673] text-xs">로딩 중...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-[#5e6673] text-xs">결과 없음</div>
          </div>
        ) : (
          <div>
            {filteredItems.map(item => {
              const priceChange = parseFloat(item.priceChangePercent);
              const isUp = priceChange > 0;
              const isSelected = item.symbol === selectedSymbol;

              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={cn(
                    "px-2 py-1.5 flex items-center hover:bg-[#1e2024] cursor-pointer transition-all",
                    isSelected && "bg-[#2b3139]"
                  )}
                >
                  {/* Favorite & Name */}
                  <div className="flex-1 flex items-center gap-1">
                    <button
                      onClick={(e) => toggleFavorite(item.symbol, e)}
                      className="p-0.5 hover:bg-[#2b3139] rounded"
                    >
                      <Star
                        className={cn(
                          "h-3 w-3",
                          favorites.includes(item.symbol)
                            ? "fill-[#fcd535] text-[#fcd535]"
                            : "text-[#5e6673]"
                        )}
                      />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[#eaecef]">
                        {item.symbol.replace('USDT', '').replace('BUSD', '').replace('BTC', '')}
                      </span>
                      <span className="text-[10px] text-[#5e6673]">
                        {item.symbol.endsWith('USDT') && '/USDT'}
                        {item.symbol.endsWith('BUSD') && '/BUSD'}
                        {item.symbol.endsWith('BTC') && '/BTC'}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex-1 text-right">
                    <div className="text-xs font-medium text-[#eaecef] tabular-nums">
                      {formatPrice(item.lastPrice)}
                    </div>
                  </div>

                  {/* Change % */}
                  <div className="w-16 text-right">
                    <span
                      className={cn(
                        "inline-block px-1.5 py-0.5 text-[10px] font-medium rounded tabular-nums",
                        isUp
                          ? "bg-[#0ecb81]/15 text-[#0ecb81]"
                          : "bg-[#f6465d]/15 text-[#f6465d]"
                      )}
                    >
                      {formatPercent(item.priceChangePercent)}
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="w-20 text-right">
                    <div className="text-[10px] text-[#848e9c] tabular-nums">
                      {formatVolume(item.quoteVolume)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 flex items-center justify-between border-t border-[#2b3139]">
        <span className="text-[10px] text-[#5e6673]">
          {filteredItems.length}개 / 전체 {mergedData.size}개 마켓
        </span>
        <div className="flex items-center gap-1">
          {isConnected ? (
            <>
              <div className="h-1.5 w-1.5 bg-[#0ecb81] rounded-full animate-pulse" />
              <span className="text-[10px] text-[#0ecb81]">실시간</span>
            </>
          ) : (
            <>
              <div className="h-1.5 w-1.5 bg-[#f6465d] rounded-full" />
              <span className="text-[10px] text-[#5e6673]">연결 끊김</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
