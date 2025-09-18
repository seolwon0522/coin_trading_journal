'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Search, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice, formatVolume } from '@/lib/format';

interface MarketData {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  count: number;
}

interface MarketListProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function MarketList({ isCollapsed = false, onToggleCollapse }: MarketListProps) {
  const router = useRouter();
  const params = useParams();
  const currentSymbol = params.symbol as string;

  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('USDT');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'volume' | 'change'>('volume');
  const [loading, setLoading] = useState(true);

  // 로컬스토리지에서 즐겨찾기 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('favoriteSymbols');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  // 바이낸스 24시간 티커 데이터 가져오기
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/binance/ticker');
        const data = await response.json();
        setMarkets(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch markets:', error);
        setLoading(false);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000); // 30초마다 업데이트 (성능 개선)
    return () => clearInterval(interval);
  }, []);

  // WebSocket으로 실시간 가격 업데이트 - 비활성화 (성능 문제로 인해)
  // 대신 10초마다 API로 업데이트
  /*
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let mounted = true;

    const connect = () => {
      if (!mounted) return;

      try {
        // Binance WebSocket URL (포트 없이)
        ws = new WebSocket('wss://stream.binance.com/ws/!ticker@arr');

        ws.onopen = () => {
          console.log('MarketList WebSocket connected');
        };

        ws.onmessage = (event) => {
          if (!mounted) return;
          try {
            const updates = JSON.parse(event.data);
            setMarkets(prev => {
              const marketMap = new Map(prev.map(m => [m.symbol, m]));

              updates.forEach((update: any) => {
                if (marketMap.has(update.s)) {
                  marketMap.set(update.s, {
                    symbol: update.s,
                    lastPrice: update.c,
                    priceChange: update.p,
                    priceChangePercent: update.P,
                    volume: update.v,
                    quoteVolume: update.q,
                    count: update.n,
                  });
                }
              });

              return Array.from(marketMap.values());
            });
          } catch (err) {
            console.error('Failed to parse market data:', err);
          }
        };

        ws.onerror = (error) => {
          console.warn('MarketList WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('MarketList WebSocket closed, reconnecting...');
          if (mounted) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        if (mounted) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    };

    // 초기 연결 지연 (성능 최적화)
    const initTimeout = setTimeout(connect, 1000);

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, []);
  */

  // 즐겨찾기 토글
  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(s => s !== symbol)
      : [...favorites, symbol];
    setFavorites(newFavorites);
    localStorage.setItem('favoriteSymbols', JSON.stringify(newFavorites));
  };

  // 필터링 및 정렬
  const filteredMarkets = useMemo(() => {
    let filtered = markets.filter(m => {
      // 탭별 필터링
      if (selectedTab === '★' && !favorites.includes(m.symbol)) return false;
      if (selectedTab !== '★' && !m.symbol.endsWith(selectedTab)) return false;

      // 검색어 필터링
      if (searchQuery && !m.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'volume') {
        return parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume);
      } else {
        return parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent);
      }
    });

    return filtered;
  }, [markets, selectedTab, searchQuery, favorites, sortBy]);

  // 심볼 선택
  const handleSymbolClick = (symbol: string) => {
    router.push(`/trading/${symbol}`);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[#161a1e] border-r border-gray-800 flex flex-col items-center py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 mb-4"
        >
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Button>
        <div className="writing-mode-vertical text-xs text-gray-500 select-none">
          마켓 리스트
        </div>
      </div>
    );
  }

  return (
    <div className="w-[300px] bg-[#161a1e] border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* 헤더 */}
      <div className="flex-shrink-0 p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-200">마켓</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortBy(sortBy === 'volume' ? 'change' : 'volume')}
              className="h-6 px-2 text-xs text-gray-400 hover:text-white"
            >
              {sortBy === 'volume' ? '거래량' : '변동률'}
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-6 w-6"
              >
                <ChevronLeft className="h-3 w-3 text-gray-400" />
              </Button>
            )}
          </div>
        </div>

        {/* 검색창 */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
          <Input
            type="text"
            placeholder="검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs bg-gray-900/50 border-gray-700 text-gray-200 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* 마켓 탭 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="flex-shrink-0 w-full rounded-none bg-transparent border-b border-gray-800 h-8 p-0">
          <TabsTrigger
            value="★"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-yellow-500 rounded-none h-8 text-xs"
          >
            ★
          </TabsTrigger>
          <TabsTrigger
            value="USDT"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 text-xs"
          >
            USDT
          </TabsTrigger>
          <TabsTrigger
            value="BTC"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 text-xs"
          >
            BTC
          </TabsTrigger>
          <TabsTrigger
            value="BUSD"
            className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 text-xs"
          >
            BUSD
          </TabsTrigger>
        </TabsList>

        {/* 마켓 리스트 */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* 컬럼 헤더 */}
          <div className="sticky top-0 z-10 bg-[#161a1e] border-b border-gray-800 px-3 py-1 flex items-center text-[10px] text-gray-500">
            <div className="w-4"></div>
            <div className="flex-1 ml-1">페어</div>
            <div className="w-20 text-right">가격</div>
            <div className="w-16 text-right">변동률</div>
          </div>

          {/* 마켓 아이템들 */}
          {loading ? (
            <div className="p-4 text-center text-xs text-gray-500">로딩 중...</div>
          ) : filteredMarkets.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              {searchQuery ? '검색 결과가 없습니다' : '마켓이 없습니다'}
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {filteredMarkets.slice(0, 100).map((market) => {
                const isSelected = market.symbol === currentSymbol;
                const isFavorite = favorites.includes(market.symbol);
                const changePercent = parseFloat(market.priceChangePercent);
                const isPositive = changePercent >= 0;

                return (
                  <div
                    key={market.symbol}
                    className={cn(
                      'px-3 py-2 flex items-center gap-1 hover:bg-gray-800/30 cursor-pointer transition-colors',
                      isSelected && 'bg-gray-800/50'
                    )}
                    onClick={() => handleSymbolClick(market.symbol)}
                  >
                    {/* 즐겨찾기 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(market.symbol);
                      }}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          'h-3 w-3',
                          isFavorite
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-gray-600 hover:text-gray-400'
                        )}
                      />
                    </button>

                    {/* 심볼 */}
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-200">
                        {market.symbol.replace(selectedTab === '★' ? /USDT|BTC|BUSD/ : selectedTab, '')}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Vol {formatVolume(market.quoteVolume)}
                      </div>
                    </div>

                    {/* 가격 */}
                    <div className="w-20 text-right">
                      <div className="text-xs text-gray-200">
                        {formatPrice(market.lastPrice)}
                      </div>
                    </div>

                    {/* 변동률 */}
                    <div className="w-16 text-right">
                      <div
                        className={cn(
                          'text-xs font-medium px-1.5 py-0.5 rounded',
                          isPositive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        )}
                      >
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}