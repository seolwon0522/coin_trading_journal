'use client';

import { useState, useMemo } from 'react';
import {
  useBinanceExchangeInfo,
  useAllBinanceTickerPrices,
  useBinanceTickerPrice,
} from '@/hooks/use-coin-price';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Search, TrendingUp, Star, StarOff, X, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TradingViewChart } from '@/components/tradingview-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 주요 코인들의 한글 이름 매핑
const COIN_NAMES: { [key: string]: string } = {
  BTC: '비트코인',
  ETH: '이더리움',
  BNB: '바이낸스 코인',
  ADA: '에이다',
  SOL: '솔라나',
  DOT: '폴카닷',
  DOGE: '도지코인',
  AVAX: '아발란체',
  MATIC: '폴리곤',
  LINK: '체인링크',
  UNI: '유니스왑',
  LTC: '라이트코인',
  BCH: '비트코인 캐시',
  XRP: '리플',
  ATOM: '코스모스',
  NEAR: '니어 프로토콜',
  FTM: '팬텀',
  ALGO: '알고랜드',
  VET: '비체인',
  ICP: '인터넷 컴퓨터',
  FIL: '파일코인',
  TRX: '트론',
  ETC: '이더리움 클래식',
  XLM: '스텔라',
  HBAR: '헤데라',
  THETA: '세타',
  XTZ: '테조스',
  AXS: '엑시 인피니티',
  SAND: '샌드박스',
  MANA: '디센트럴랜드',
  GALA: '갈라',
  CHZ: '칠리즈',
  ENJ: '엔진',
  HOT: '홀로체인',
  BAT: '브레이브',
  ZIL: '질리카',
  ONE: '하모니',
  IOTA: '아이오타',
  NEO: '네오',
  QTUM: '퀀텀',
  ZEC: '지캐시',
  DASH: '대시',
  XMR: '모네로',
  WAVES: '웨이브',
  RVN: '레이븐코인',
  CAKE: '팬케이스왑',
  SUSHI: '스시스왑',
  AAVE: '에이브',
  COMP: '컴파운드',
  MKR: '메이커다오',
  YFI: '연파이낸스',
  SNX: '신세틱스',
  CRV: '커브',
  '1INCH': '1인치',
  GRT: '그래프',
  ANKR: '앵커',
  STORJ: '스토리지',
  OCEAN: '오션 프로토콜',
  ALPHA: '알파 파이낸스',
  AUDIO: '오디우스',
  BAND: '밴드 프로토콜',
  CTSI: '카르테시',
  DYDX: '디와이디엑스',
  EGLD: '멀티버스엑스',
  FLOW: '플로우',
  HIVE: '하이브',
  ICX: '아이콘',
  IOTX: '아이오텍스',
  KAVA: '카바',
  KSM: '쿠사마',
  LRC: '루프링',
  NULS: '널스',
  OMG: '오미세고',
  ONT: '온톨로지',
  PROM: '프로메테우스',
  QNT: '퀀트',
  REN: '렌',
  RSR: '리저브라이트',
  SKL: '스케일',
  SRM: '세럼',
  STMX: '스톰엑스',
  SXP: '솔라',
  TFUEL: '세타 퓨엘',
  TOMO: '토모체인',
  TRB: '텔러',
  TROY: '트로이',
  VTHO: '베토르',
  WRX: '렉스',
  ZRX: '제로엑스',
};

// 정렬 타입 정의
type SortField = 'symbol' | 'price' | 'change' | 'volume';
type SortDirection = 'asc' | 'desc';

// 바이낸스 스타일 코인 마켓 컴포넌트
export function BinanceCoinSelector() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT'])
  );
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [showChart, setShowChart] = useState<boolean>(false);

  // 바이낸스 거래소 정보 가져오기
  const {
    data: exchangeInfo,
    isLoading: isLoadingExchange,
    isError: isExchangeError,
    error: exchangeError,
  } = useBinanceExchangeInfo();

  // 모든 코인의 가격 정보 가져오기
  const {
    data: allTickerData,
    isLoading: isLoadingTicker,
    isError: isTickerError,
    error: tickerError,
  } = useAllBinanceTickerPrices();

  // 선택된 코인의 상세 정보 가져오기
  const { data: selectedTickerData, isLoading: isLoadingSelectedTicker } =
    useBinanceTickerPrice(selectedSymbol);

  // 카테고리 필터링
  const categories = [
    { id: 'All', name: '전체' },
    { id: 'Major', name: '주요 코인' },
    { id: 'DeFi', name: 'DeFi' },
    { id: 'Gaming', name: '게임' },
    { id: 'AI', name: 'AI' },
    { id: 'Metaverse', name: '메타버스' },
  ];

  // 코인 카테고리 매핑
  const getCoinCategory = (symbol: string) => {
    const majorCoins = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'DOGE', 'AVAX', 'MATIC'];
    const defiCoins = ['UNI', 'AAVE', 'COMP', 'MKR', 'YFI', 'SNX', 'CRV', '1INCH', 'SUSHI', 'CAKE'];
    const gamingCoins = ['AXS', 'SAND', 'MANA', 'GALA', 'ENJ', 'CHZ'];
    const aiCoins = ['FET', 'OCEAN', 'AGIX', 'RNDR', 'GRT', 'BAND'];
    const metaverseCoins = ['SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'CHZ'];

    const baseAsset = symbol.replace('USDT', '');

    if (majorCoins.includes(baseAsset)) return 'Major';
    if (defiCoins.includes(baseAsset)) return 'DeFi';
    if (gamingCoins.includes(baseAsset)) return 'Gaming';
    if (aiCoins.includes(baseAsset)) return 'AI';
    if (metaverseCoins.includes(baseAsset)) return 'Metaverse';

    return 'Other';
  };

  // 거래 가능한 USDT 페어만 필터링하고 검색어로 필터링
  const availableSymbols = useMemo(() => {
    if (!exchangeInfo?.symbols || !allTickerData) return [];

    let symbols = exchangeInfo.symbols
      .filter(
        (symbol) =>
          symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT' && symbol.isSpotTradingAllowed
      )
      .map((symbol) => {
        const ticker = allTickerData.find((t) => t.symbol === symbol.symbol);
        return {
          symbol: symbol.symbol,
          baseAsset: symbol.baseAsset,
          quoteAsset: symbol.quoteAsset,
          koreanName: COIN_NAMES[symbol.baseAsset] || symbol.baseAsset,
          price: ticker?.lastPrice || '0',
          priceChange: ticker?.priceChange || '0',
          priceChangePercent: ticker?.priceChangePercent || '0',
          volume: ticker?.volume || '0',
          quoteVolume: ticker?.quoteVolume || '0',
          highPrice: ticker?.highPrice || '0',
          lowPrice: ticker?.lowPrice || '0',
          category: getCoinCategory(symbol.symbol),
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

    // 카테고리 필터링
    if (selectedCategory !== 'All') {
      symbols = symbols.filter((symbol) => symbol.category === selectedCategory);
    }

    // 정렬
    symbols.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortField) {
        case 'symbol':
          aValue = a.baseAsset;
          bValue = b.baseAsset;
          break;
        case 'price':
          aValue = parseFloat(a.price);
          bValue = parseFloat(b.price);
          break;
        case 'change':
          aValue = parseFloat(a.priceChangePercent);
          bValue = parseFloat(b.priceChangePercent);
          break;
        case 'volume':
          aValue = parseFloat(a.quoteVolume);
          bValue = parseFloat(b.quoteVolume);
          break;
        default:
          aValue = a.baseAsset;
          bValue = b.baseAsset;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return symbols.slice(0, 100); // 상위 100개만 표시
  }, [exchangeInfo, allTickerData, searchTerm, selectedCategory, sortField, sortDirection]);

  // 가격 변화율에 따른 색상 결정
  const getPriceChangeColor = (changePercent: string) => {
    const change = parseFloat(changePercent);
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  // 숫자 포맷팅 함수
  const formatNumber = (value: string, decimals: number = 2) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // 볼륨 포맷팅 함수
  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return formatNumber(volume, 0);
  };

  // 정렬 헤더 클릭 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = (symbol: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol);
    } else {
      newFavorites.add(symbol);
    }
    setFavorites(newFavorites);
  };

  // 테이블 행 클릭 핸들러
  const handleRowClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setShowChart(true);
  };

  // 차트 닫기 핸들러
  const handleCloseChart = () => {
    setShowChart(false);
    setSelectedSymbol('');
  };

  if (isLoadingExchange || isLoadingTicker) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>바이낸스 마켓</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isExchangeError || isTickerError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>바이낸스 마켓</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">
            <p>
              데이터를 불러오는데 실패했습니다: {exchangeError?.message || tickerError?.message}
            </p>
            <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            바이낸스 마켓
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 및 필터 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="코인명 또는 심볼로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 코인 테이블 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('symbol')}
                    >
                      <div className="flex items-center gap-1">
                        심볼
                        {sortField === 'symbol' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center gap-1">
                        최종가
                        {sortField === 'price' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('change')}
                    >
                      <div className="flex items-center gap-1">
                        24시간 변동
                        {sortField === 'change' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/70"
                      onClick={() => handleSort('volume')}
                    >
                      <div className="flex items-center gap-1">
                        24시간 거래대금
                        {sortField === 'volume' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          ))}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableSymbols.map((symbol) => (
                    <TableRow
                      key={symbol.symbol}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleRowClick(symbol.symbol)}
                    >
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(symbol.symbol);
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {favorites.has(symbol.symbol) ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{symbol.baseAsset}</div>
                          <div className="text-xs text-muted-foreground">{symbol.koreanName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono">${formatNumber(symbol.price, 4)}</div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`font-mono ${getPriceChangeColor(symbol.priceChangePercent)}`}
                        >
                          {parseFloat(symbol.priceChangePercent) > 0 ? '+' : ''}
                          {parseFloat(symbol.priceChangePercent).toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">${formatVolume(symbol.quoteVolume)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {availableSymbols.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>검색 결과가 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 차트 모달 */}
      {showChart && selectedSymbol && (
        <Card className="w-full max-w-7xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {availableSymbols.find((s) => s.symbol === selectedSymbol)?.koreanName}(
                {availableSymbols.find((s) => s.symbol === selectedSymbol)?.baseAsset})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCloseChart}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoadingSelectedTicker ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ) : selectedTickerData ? (
              <div className="space-y-6">
                {/* 현재 가격 정보 */}
                <div className="text-center">
                  <h3 className="text-3xl font-bold">
                    ${formatNumber(selectedTickerData.lastPrice, 4)}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={getPriceChangeColor(selectedTickerData.priceChangePercent)}>
                      {parseFloat(selectedTickerData.priceChangePercent) > 0 ? '+' : ''}
                      {parseFloat(selectedTickerData.priceChangePercent).toFixed(2)}%
                    </span>
                    <span className="text-sm text-gray-500">
                      (${formatNumber(selectedTickerData.priceChange, 4)})
                    </span>
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">24시간 최고가</span>
                      <span className="font-medium">
                        ${formatNumber(selectedTickerData.highPrice, 4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">24시간 최저가</span>
                      <span className="font-medium">
                        ${formatNumber(selectedTickerData.lowPrice, 4)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">시가</span>
                      <span className="font-medium">
                        ${formatNumber(selectedTickerData.openPrice, 4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">거래량</span>
                      <span className="font-medium">{formatVolume(selectedTickerData.volume)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">거래대금</span>
                      <span className="font-medium">
                        ${formatVolume(selectedTickerData.quoteVolume)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">거래 횟수</span>
                      <span className="font-medium">
                        {selectedTickerData.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">매수 호가</span>
                      <span className="font-medium">
                        ${formatNumber(selectedTickerData.bidPrice, 4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">매도 호가</span>
                      <span className="font-medium">
                        ${formatNumber(selectedTickerData.askPrice, 4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TradingView 차트 */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-600">실시간 차트</span>
                  </div>
                  <div className="w-full h-[600px]">
                    <TradingViewChart symbol={selectedSymbol} height={600} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-red-600">
                <p>선택된 코인의 정보를 불러올 수 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
