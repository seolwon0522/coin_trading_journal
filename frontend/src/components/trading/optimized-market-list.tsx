'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, StarOff, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TieredMarketData, CoinRanking, MarketDataResponse } from '@/types/market';
import { Badge } from "@/components/ui/badge";
import { debounce } from 'lodash';
import { ScrollArea } from "@/components/ui/scroll-area";

interface OptimizedMarketListProps {
  onSelectSymbol: (symbol: string) => void;
  selectedSymbol?: string;
}

const ITEM_HEIGHT = 60; // 각 아이템의 높이
const BATCH_SIZE = 50; // 한 번에 로드할 아이템 수
const SEARCH_DEBOUNCE = 300; // 검색 디바운스 시간

export default function OptimizedMarketList({
  onSelectSymbol,
  selectedSymbol
}: OptimizedMarketListProps) {
  const [tieredData, setTieredData] = useState<TieredMarketData | null>(null);
  const [displayItems, setDisplayItems] = useState<CoinRanking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<Map<string, CoinRanking>>(new Map());

  // 초기 데이터 로드
  useEffect(() => {
    loadFavorites();
    return () => {
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, [wsConnection]);

  // 초기 데이터 로드
  useEffect(() => {
    loadTieredData();
  }, []);

  // 탭 변경 시 데이터 다시 로드
  useEffect(() => {
    if (selectedTab !== 'favorites') {
      loadTieredData();
    }
  }, [selectedTab]);

  // 계층적 데이터 로드
  const loadTieredData = async () => {
    setIsLoading(true);
    try {
      const quoteAsset = selectedTab !== 'all' && selectedTab !== 'favorites' ? selectedTab.toUpperCase() : undefined;
      const response = await fetch(`/api/markets/tiered${quoteAsset ? `?quoteAsset=${quoteAsset}` : ''}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data: TieredMarketData = await response.json();

      setTieredData(data);

      // Premium과 Standard 코인을 합쳐서 초기 표시
      const initialItems = [...data.premium, ...data.standard];
      setDisplayItems(initialItems);

      // Map에 저장 (빠른 업데이트를 위해)
      initialItems.forEach(item => {
        itemsRef.current.set(item.symbol, item);
      });

      // WebSocket 구독 (Premium 코인만)
      subscribeToWebSocket(data.premium.map(c => c.symbol));

      setHasMore(data.totalCount > initialItems.length);
    } catch (error) {
      console.error('Failed to load market data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket 구독 (보이는 코인만)
  const subscribeToWebSocket = (symbols: string[]) => {
    // 기존 연결 종료
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }

    // 심볼이 없으면 연결하지 않음
    if (!symbols || symbols.length === 0) {
      return;
    }

    try {
      // Binance WebSocket URL (포트 없이)
      const ws = new WebSocket('wss://stream.binance.com/ws');

      ws.onopen = () => {
        console.log('OptimizedMarketList WebSocket connected');
        // 선택적 구독 - Premium 코인만
        const streams = symbols.slice(0, 50).map(s => `${s.toLowerCase()}@ticker`); // 최대 50개 제한
        if (streams.length > 0) {
          ws.send(JSON.stringify({
            method: 'SUBSCRIBE',
            params: streams,
            id: 1
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === '24hrTicker') {
            updateCoinData(data);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('OptimizedMarketList WebSocket error (will auto-reconnect):', error);
      };

      ws.onclose = () => {
        console.log('OptimizedMarketList WebSocket closed');
        setWsConnection(null);
      };

      setWsConnection(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  // 실시간 데이터 업데이트
  const updateCoinData = (streamData: any) => {
    const symbol = streamData.s;
    const existingItem = itemsRef.current.get(symbol);

    if (existingItem) {
      const updated: CoinRanking = {
        ...existingItem,
        lastPrice: parseFloat(streamData.c),
        priceChangePercent24h: parseFloat(streamData.P),
        volume24h: parseFloat(streamData.v),
        quoteVolume24h: parseFloat(streamData.q),
        highPrice24h: parseFloat(streamData.h),
        lowPrice24h: parseFloat(streamData.l),
        lastUpdateTime: new Date().toISOString()
      };

      itemsRef.current.set(symbol, updated);

      // UI 업데이트
      setDisplayItems(prev =>
        prev.map(item => item.symbol === symbol ? updated : item)
      );
    }
  };

  // 추가 데이터 로드
  const loadMoreItems = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = displayItems.length;
      const response = await fetch(`/api/markets/load-more?offset=${offset}&limit=${BATCH_SIZE}`);
      const newItems: CoinRanking[] = await response.json();

      if (newItems.length > 0) {
        // 새 아이템 추가
        newItems.forEach(item => {
          itemsRef.current.set(item.symbol, item);
        });

        setDisplayItems(prev => [...prev, ...newItems]);
        setHasMore(newItems.length === BATCH_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, displayItems.length]);

  // 검색 처리
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        loadTieredData();
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/markets/search?query=${encodeURIComponent(query)}&limit=50`);
        const results: CoinRanking[] = await response.json();
        setDisplayItems(results);
        setHasMore(false);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE),
    []
  );

  // 즐겨찾기 관리
  const loadFavorites = () => {
    const saved = localStorage.getItem('favoriteCoins');
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  };

  const toggleFavorite = (symbol: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol);
    } else {
      newFavorites.add(symbol);
    }
    setFavorites(newFavorites);
    localStorage.setItem('favoriteCoins', JSON.stringify(Array.from(newFavorites)));
  };

  // 필터링된 아이템
  const filteredItems = useMemo(() => {
    let items = displayItems;

    // 탭 필터링
    if (selectedTab === 'favorites') {
      items = items.filter(item => favorites.has(item.symbol));
    } else if (selectedTab !== 'all') {
      items = items.filter(item => item.quoteAsset === selectedTab.toUpperCase());
    }

    return items;
  }, [displayItems, selectedTab, favorites]);

  // 무한 스크롤을 위한 Intersection Observer 설정
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loadMoreItems]);

  // 아이템 렌더링
  const renderItem = (item: CoinRanking, index: number) => {
    const isFavorite = favorites.has(item.symbol);
    const isPositive = item.priceChangePercent24h >= 0;

    return (
      <div
        key={item.symbol}
        className={cn(
          "flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b",
          selectedSymbol === item.symbol && "bg-muted"
        )}
        onClick={() => {
          console.log('Symbol clicked:', item.symbol);
          onSelectSymbol(item.symbol);
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item.symbol);
            }}
            className="text-muted-foreground hover:text-yellow-500"
          >
            {isFavorite ? <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> : <StarOff className="w-4 h-4" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.baseAsset}</span>
              <span className="text-xs text-muted-foreground">/{item.quoteAsset}</span>
              {item.tier === 1 && <Badge variant="secondary" className="text-xs">Premium</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              Vol: {(item.quoteVolume24h / 1000000).toFixed(2)}M
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-sm">
            ${item.lastPrice.toFixed(item.lastPrice < 1 ? 4 : 2)}
          </div>
          <div className={cn(
            "flex items-center justify-end gap-1 text-xs",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{item.priceChangePercent24h.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  };


  return (
    <Card className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="p-4 space-y-4 border-b">
        {/* 검색 바 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search coins..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
          />
        </div>

        {/* 탭 */}
        <Tabs value={selectedTab} onValueChange={(value) => {
          console.log('Tab changed to:', value);
          setSelectedTab(value);
        }}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="usdt">USDT</TabsTrigger>
            <TabsTrigger value="btc">BTC</TabsTrigger>
            <TabsTrigger value="busd">BUSD</TabsTrigger>
            <TabsTrigger value="favorites">★</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 성능 지표 */}
        {tieredData && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total: {tieredData.totalCount} coins</span>
            <span>Load: {tieredData.loadTime}ms</span>
            <span>Cache: {tieredData.cacheStatus}</span>
          </div>
        )}
      </div>

      {/* 스크롤 가능한 리스트 */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="space-y-0">
              {filteredItems.map((item, index) => renderItem(item, index))}

              {/* 무한 스크롤 트리거 */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {isLoadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Scroll for more...</span>
                  )}
                </div>
              )}

              {!hasMore && filteredItems.length > 0 && (
                <div className="py-4 flex justify-center">
                  <span className="text-xs text-muted-foreground">End of list</span>
                </div>
              )}

              {filteredItems.length === 0 && (
                <div className="py-8 flex justify-center">
                  <span className="text-muted-foreground">No coins found</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}