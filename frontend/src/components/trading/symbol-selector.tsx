'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BinanceApi, SymbolInfo, Ticker24hr } from '@/lib/api/binance-api';
import { Search, Star, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SymbolWithTicker {
  symbol: SymbolInfo;
  ticker: Ticker24hr;
}

interface SymbolSelectorProps {
  currentSymbol: string;
  className?: string;
}

export function SymbolSelector({ currentSymbol, className }: SymbolSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [symbols, setSymbols] = useState<SymbolWithTicker[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState('USDT');

  const api = new BinanceApi();

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favoriteSymbols');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  // Fetch symbols and tickers
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [exchangeInfo, tickers] = await Promise.all([
          api.getExchangeInfo(),
          api.get24hrTickers(),
        ]);

        const tickerMap = new Map(tickers.map(t => [t.symbol, t]));

        const symbolsWithTickers = exchangeInfo.symbols
          .filter(s => s.status === 'TRADING' && s.isSpotTradingAllowed)
          .map(symbol => ({
            symbol,
            ticker: tickerMap.get(symbol.symbol) || ({
              symbol: symbol.symbol,
              lastPrice: '0',
              priceChangePercent: '0',
              quoteVolume: '0',
            } as Ticker24hr),
          }))
          .filter(s => s.ticker !== null);

        setSymbols(symbolsWithTickers);
      } catch (error) {
        console.error('Failed to fetch symbols:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  // Filter symbols based on search and market
  const filteredSymbols = useMemo(() => {
    let filtered = symbols;

    // Filter by market
    if (selectedMarket !== 'ALL') {
      filtered = filtered.filter(s => s.symbol.quoteAsset === selectedMarket);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toUpperCase();
      filtered = filtered.filter(s =>
        s.symbol.symbol.includes(query) ||
        s.symbol.baseAsset.includes(query)
      );
    }

    // Sort by volume
    return filtered.sort((a, b) => {
      const volumeA = parseFloat(b.ticker.quoteVolume);
      const volumeB = parseFloat(a.ticker.quoteVolume);
      return volumeA - volumeB;
    });
  }, [symbols, searchQuery, selectedMarket]);

  // Favorite symbols
  const favoriteSymbols = useMemo(() => {
    return symbols.filter(s => favorites.includes(s.symbol.symbol));
  }, [symbols, favorites]);

  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol];

    setFavorites(newFavorites);
    localStorage.setItem('favoriteSymbols', JSON.stringify(newFavorites));
  };

  const selectSymbol = (symbol: string) => {
    router.push(`/trading/${symbol}`);
    setOpen(false);
  };

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const renderSymbolRow = (item: SymbolWithTicker) => {
    const priceChange = parseFloat(item.ticker.priceChangePercent);
    const isFavorite = favorites.includes(item.symbol.symbol);

    return (
      <div
        key={item.symbol.symbol}
        className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer rounded-md"
        onClick={() => selectSymbol(item.symbol.symbol)}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item.symbol.symbol);
            }}
            className="text-muted-foreground hover:text-yellow-500"
          >
            <Star
              className={cn('h-4 w-4', isFavorite && 'fill-yellow-500 text-yellow-500')}
            />
          </button>
          <div>
            <div className="font-medium">{item.symbol.baseAsset}/{item.symbol.quoteAsset}</div>
            <div className="text-xs text-muted-foreground">
              거래량: {formatVolume(item.ticker.quoteVolume)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">{parseFloat(item.ticker.lastPrice).toFixed(8)}</div>
          <div
            className={cn(
              'text-xs flex items-center justify-end gap-1',
              priceChange > 0 ? 'text-green-500' : priceChange < 0 ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {priceChange > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : priceChange < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(priceChange).toFixed(2)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          {currentSymbol}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>거래 페어 선택</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="심볼 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Market Tabs */}
          <Tabs value={selectedMarket} onValueChange={setSelectedMarket}>
            <TabsList>
              <TabsTrigger value="ALL">전체</TabsTrigger>
              <TabsTrigger value="USDT">USDT</TabsTrigger>
              <TabsTrigger value="BUSD">BUSD</TabsTrigger>
              <TabsTrigger value="BTC">BTC</TabsTrigger>
              <TabsTrigger value="ETH">ETH</TabsTrigger>
              <TabsTrigger value="BNB">BNB</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedMarket} className="mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  심볼 불러오는 중...
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  {/* Favorites Section */}
                  {favoriteSymbols.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        즐겨찾기
                      </h3>
                      <div className="space-y-1">
                        {favoriteSymbols.map(renderSymbolRow)}
                      </div>
                    </div>
                  )}

                  {/* All Symbols */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      전체 마켓
                    </h3>
                    <div className="space-y-1">
                      {filteredSymbols.map(renderSymbolRow)}
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}