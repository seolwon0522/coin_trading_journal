'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBinanceExchangeInfo } from '@/hooks/use-coin-price';

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

interface CoinAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CoinAutocomplete({ value, onChange, placeholder = "코인명 또는 심볼로 검색...", className }: CoinAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [filteredCoins, setFilteredCoins] = useState<Array<{symbol: string, baseAsset: string, koreanName: string}>>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 바이낸스 거래소 정보 가져오기
  const { data: exchangeInfo, isLoading } = useBinanceExchangeInfo();

  // 사용 가능한 코인 목록 생성
  const [availableCoins, setAvailableCoins] = useState<Array<{symbol: string, baseAsset: string, koreanName: string}>>([]);

  useEffect(() => {
    if (!exchangeInfo?.symbols) {
      setAvailableCoins([]);
      return;
    }

    const coins = exchangeInfo.symbols
      .filter(symbol => 
        symbol.status === 'TRADING' && 
        symbol.quoteAsset === 'USDT' && 
        symbol.isSpotTradingAllowed
      )
      .map(symbol => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        koreanName: COIN_NAMES[symbol.baseAsset] || symbol.baseAsset
      }));

    setAvailableCoins(coins);
  }, [exchangeInfo]);

  // value가 변경될 때 searchTerm 업데이트
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // 검색어에 따른 필터링
  useEffect(() => {
    if (!availableCoins || !searchTerm.trim()) {
      setFilteredCoins([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = availableCoins.filter(coin =>
      coin.baseAsset.toLowerCase().includes(searchLower) ||
      coin.koreanName.toLowerCase().includes(searchLower) ||
      coin.symbol.toLowerCase().includes(searchLower)
    ).slice(0, 10); // 상위 10개만 표시

    setFilteredCoins(filtered);
    setSelectedIndex(-1);
  }, [searchTerm, availableCoins]);

  // 입력값 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  // 코인 선택 핸들러
  const handleCoinSelect = (coin: {symbol: string, baseAsset: string, koreanName: string}) => {
    onChange(coin.symbol);
    setSearchTerm(coin.symbol);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredCoins.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCoins.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleCoinSelect(filteredCoins[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 입력 필드 포커스 시 드롭다운 열기
  const handleFocus = () => {
    if (filteredCoins.length > 0) {
      setIsOpen(true);
    }
  };

  // 검색어 초기화
  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      </div>

      {/* 드롭다운 */}
      {isOpen && (filteredCoins.length > 0 || isLoading) && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto"
        >
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                코인 목록을 불러오는 중...
              </div>
            ) : filteredCoins.length > 0 ? (
              <div className="py-1">
                {filteredCoins.map((coin, index) => (
                  <button
                    key={coin.symbol}
                    type="button"
                    onClick={() => handleCoinSelect(coin)}
                    className={`w-full px-4 py-2 text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none ${
                      index === selectedIndex ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{coin.baseAsset}</div>
                        <div className="text-xs text-muted-foreground">{coin.koreanName}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{coin.symbol}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchTerm && (
              <div className="p-4 text-center text-gray-500">
                검색 결과가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 