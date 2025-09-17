'use client';

import { useState } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 커스텀 훅과 컴포넌트
import {
  useBinanceExchangeInfo,
  useAllBinanceTickerPrices,
  useBinanceTickerPrice,
} from '@/hooks/use-coin-price';
import { useCoinFilter, SortField, SortDirection } from '@/hooks/use-coin-filter';
import { CoinTable } from './coin-table';
import { CoinDetailModal } from './coin-detail-modal';
import { COIN_NAMES } from '@/constants/coin-names';

// 카테고리 설정
const CATEGORIES = [
  { id: 'All', name: '전체' },
  { id: 'Major', name: '주요 코인' },
  { id: 'DeFi', name: 'DeFi' },
  { id: 'Gaming', name: '게임' },
  { id: 'AI', name: 'AI' },
  { id: 'Metaverse', name: '메타버스' },
];

// 초기 즐겨찾기 설정
const DEFAULT_FAVORITES = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];

/**
 * 바이낸스 코인 선택기 컴포넌트
 * - 실시간 코인 가격 표시
 * - 검색 및 필터링 기능
 * - 정렬 기능
 * - 상세 정보 모달
 */
export function BinanceCoinSelector() {
  // 상태 관리
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(DEFAULT_FAVORITES));
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [showChart, setShowChart] = useState(false);

  // API 데이터 페칭
  const {
    data: exchangeInfo,
    isLoading: isLoadingExchange,
    isError: isExchangeError,
    error: exchangeError,
  } = useBinanceExchangeInfo();

  const {
    data: allTickerData,
    isLoading: isLoadingTicker,
    isError: isTickerError,
    error: tickerError,
  } = useAllBinanceTickerPrices();

  const { data: selectedTickerData, isLoading: isLoadingSelectedTicker } =
    useBinanceTickerPrice(selectedSymbol);

  // 필터링된 코인 목록
  const availableSymbols = useCoinFilter({
    exchangeInfo,
    tickerData: allTickerData,
    searchTerm,
    selectedCategory,
    sortField,
    sortDirection,
    coinNames: COIN_NAMES,
  });

  // 정렬 핸들러
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

  // 행 클릭 핸들러
  const handleRowClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setShowChart(true);
  };

  // 차트 닫기 핸들러
  const handleCloseChart = () => {
    setShowChart(false);
    setSelectedSymbol('');
  };

  // 로딩 상태
  if (isLoadingExchange || isLoadingTicker) {
    return <LoadingState />;
  }

  // 에러 상태
  if (isExchangeError || isTickerError) {
    return <ErrorState error={exchangeError?.message || tickerError?.message} />;
  }

  // 선택된 코인 정보 찾기
  const selectedCoinInfo = availableSymbols.find((s) => s.symbol === selectedSymbol);

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
          {/* 검색 및 필터 섹션 */}
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={CATEGORIES}
          />

          {/* 코인 테이블 */}
          <CoinTable
            coins={availableSymbols}
            favorites={favorites}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onToggleFavorite={toggleFavorite}
            onRowClick={handleRowClick}
          />

          {/* 검색 결과 없음 */}
          {availableSymbols.length === 0 && <NoResultsMessage />}
        </CardContent>
      </Card>

      {/* 차트 모달 */}
      {showChart && selectedSymbol && selectedCoinInfo && (
        <CoinDetailModal
          symbol={selectedSymbol}
          koreanName={selectedCoinInfo.koreanName}
          baseAsset={selectedCoinInfo.baseAsset}
          tickerData={selectedTickerData}
          isLoading={isLoadingSelectedTicker}
          onClose={handleCloseChart}
        />
      )}
    </div>
  );
}

// === 하위 컴포넌트들 ===

// 검색 및 필터 섹션
function SearchAndFilter({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: typeof CATEGORIES;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* 검색 입력 */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="코인명 또는 심볼로 검색..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

// 로딩 상태 컴포넌트
function LoadingState() {
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

// 에러 상태 컴포넌트
function ErrorState({ error }: { error?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>바이낸스 마켓</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-red-600">
          <p>데이터를 불러오는데 실패했습니다: {error}</p>
          <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 검색 결과 없음 메시지
function NoResultsMessage() {
  return (
    <div className="text-center text-gray-500 py-8">
      <p>검색 결과가 없습니다.</p>
    </div>
  );
}