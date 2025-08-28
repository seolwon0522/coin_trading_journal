'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, TrendingUp, Loader2, Star, StarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useBinanceExchangeInfo,
  useAllBinanceTickerPrices,
} from '@/hooks/use-coin-price';

interface BinanceSymbolSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// 주요 코인들의 한글 이름 매핑
const COIN_NAMES: { [key: string]: string } = {
  BTC: '비트코인',
  ETH: '이더리움',
  BNB: '바이낸스 코인',
  SOL: '솔라나',
  XRP: '리플',
  ADA: '에이다',
  DOGE: '도지코인',
  AVAX: '아발란체',
  MATIC: '폴리곤',
  DOT: '폴카닷',
  LINK: '체인링크',
  UNI: '유니스왑',
  ATOM: '코스모스',
  LTC: '라이트코인',
  ETC: '이더리움 클래식',
  FIL: '파일코인',
  APT: '앱토스',
  ARB: '아비트럼',
  OP: '옵티미즘',
  INJ: '인젝티브',
  NEAR: '니어',
  FTM: '팬텀',
  ALGO: '알고랜드',
  ICP: '인터넷 컴퓨터',
  TRX: '트론',
  XLM: '스텔라',
  SAND: '샌드박스',
  MANA: '디센트럴랜드',
  AXS: '엑시 인피니티',
  GALA: '갈라',
  CHZ: '칠리즈',
};

export function BinanceSymbolSelector({
  value,
  onChange,
  placeholder = '심볼 선택...',
  className,
}: BinanceSymbolSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('favoriteSymbols');
    return stored ? new Set(JSON.parse(stored)) : new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);
  });

  // 바이낸스 거래소 정보
  const { data: exchangeInfo, isLoading: isLoadingExchange } = useBinanceExchangeInfo();
  
  // 모든 코인 가격 정보
  const { data: allTickerData, isLoading: isLoadingTicker } = useAllBinanceTickerPrices();

  // 거래 가능한 USDT 페어 필터링
  const availableSymbols = useMemo(() => {
    if (!exchangeInfo?.symbols || !allTickerData) return [];

    let symbols = exchangeInfo.symbols
      .filter(
        (symbol) =>
          symbol.status === 'TRADING' && 
          symbol.quoteAsset === 'USDT' && 
          symbol.isSpotTradingAllowed
      )
      .map((symbol) => {
        const ticker = allTickerData.find((t) => t.symbol === symbol.symbol);
        return {
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          displaySymbol: `${symbol.baseAsset}/${symbol.quoteAsset}`,
          koreanName: COIN_NAMES[symbol.baseAsset] || symbol.baseAsset,
          price: ticker?.lastPrice || '0',
          priceChangePercent: ticker?.priceChangePercent || '0',
          volume: ticker?.quoteVolume || '0',
          isFavorite: favorites.has(symbol.symbol),
        };
      });

    // 검색어 필터링
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      symbols = symbols.filter(
        (symbol) =>
          symbol.baseAsset.toLowerCase().includes(searchLower) ||
          symbol.koreanName.toLowerCase().includes(searchLower)
      );
    }

    // 정렬: 즐겨찾기 우선, 그 다음 거래량 순
    symbols.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return parseFloat(b.volume) - parseFloat(a.volume);
    });

    return symbols.slice(0, 50); // 상위 50개만 표시
  }, [exchangeInfo, allTickerData, searchTerm, favorites]);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol);
    } else {
      newFavorites.add(symbol);
    }
    setFavorites(newFavorites);
    localStorage.setItem('favoriteSymbols', JSON.stringify(Array.from(newFavorites)));
  }, [favorites]);

  // 심볼 선택
  const handleSelect = useCallback((symbol: string) => {
    // BTC/USDT 형식으로 변환
    const formattedSymbol = symbol.replace('USDT', '/USDT');
    onChange(formattedSymbol);
    setOpen(false);
    setSearchTerm('');

    // 최근 사용 심볼로 즐겨찾기에 추가
    const newFavorites = new Set(favorites);
    newFavorites.add(symbol);
    setFavorites(newFavorites);
    localStorage.setItem('favoriteSymbols', JSON.stringify(Array.from(newFavorites)));
  }, [onChange, favorites]);

  // 가격 변화 색상
  const getPriceChangeColor = (changePercent: string) => {
    const change = parseFloat(changePercent);
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  // 숫자 포맷팅
  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={`justify-between ${className}`}
      >
        <span className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {value || placeholder}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              바이낸스 심볼 선택
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 검색 입력 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="심볼 또는 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 심볼 리스트 */}
            {isLoadingExchange || isLoadingTicker ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-1">
                  {availableSymbols.map((symbol) => (
                    <div
                      key={symbol.symbol}
                      onClick={() => handleSelect(symbol.symbol)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => toggleFavorite(symbol.symbol, e)}
                          className="p-1 hover:bg-muted-foreground/10 rounded"
                        >
                          {symbol.isFavorite ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{symbol.baseAsset}</span>
                            <span className="text-xs text-muted-foreground">
                              {symbol.koreanName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono">
                              ${parseFloat(symbol.price).toFixed(4)}
                            </span>
                            <span className={getPriceChangeColor(symbol.priceChangePercent)}>
                              {parseFloat(symbol.priceChangePercent) > 0 ? '+' : ''}
                              {parseFloat(symbol.priceChangePercent).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">거래량</div>
                        <div className="text-sm font-mono">
                          ${formatVolume(symbol.volume)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {availableSymbols.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}