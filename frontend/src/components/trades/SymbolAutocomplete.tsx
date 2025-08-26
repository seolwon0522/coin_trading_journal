'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

// 인기 암호화폐 페어 목록
const POPULAR_SYMBOLS = [
  { value: 'BTC/USDT', label: 'BTC/USDT', category: 'popular' },
  { value: 'ETH/USDT', label: 'ETH/USDT', category: 'popular' },
  { value: 'BNB/USDT', label: 'BNB/USDT', category: 'popular' },
  { value: 'SOL/USDT', label: 'SOL/USDT', category: 'popular' },
  { value: 'XRP/USDT', label: 'XRP/USDT', category: 'popular' },
  { value: 'ADA/USDT', label: 'ADA/USDT', category: 'regular' },
  { value: 'DOGE/USDT', label: 'DOGE/USDT', category: 'regular' },
  { value: 'AVAX/USDT', label: 'AVAX/USDT', category: 'regular' },
  { value: 'MATIC/USDT', label: 'MATIC/USDT', category: 'regular' },
  { value: 'DOT/USDT', label: 'DOT/USDT', category: 'regular' },
  { value: 'LINK/USDT', label: 'LINK/USDT', category: 'regular' },
  { value: 'UNI/USDT', label: 'UNI/USDT', category: 'regular' },
  { value: 'ATOM/USDT', label: 'ATOM/USDT', category: 'regular' },
  { value: 'LTC/USDT', label: 'LTC/USDT', category: 'regular' },
  { value: 'ETC/USDT', label: 'ETC/USDT', category: 'regular' },
  { value: 'FIL/USDT', label: 'FIL/USDT', category: 'regular' },
  { value: 'APT/USDT', label: 'APT/USDT', category: 'regular' },
  { value: 'ARB/USDT', label: 'ARB/USDT', category: 'regular' },
  { value: 'OP/USDT', label: 'OP/USDT', category: 'regular' },
  { value: 'INJ/USDT', label: 'INJ/USDT', category: 'regular' },
];

interface SymbolAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function SymbolAutocomplete({
  value,
  onChange,
  placeholder = '심볼 선택...',
  className,
  required = false,
}: SymbolAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [recentSymbols, setRecentSymbols] = React.useState<string[]>([]);

  // 최근 사용한 심볼 로드
  React.useEffect(() => {
    const stored = localStorage.getItem('recentSymbols');
    if (stored) {
      setRecentSymbols(JSON.parse(stored));
    }
  }, []);

  // 심볼 선택 시 최근 사용 목록에 추가
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);

    // 최근 사용 목록 업데이트 (최대 5개)
    const newRecent = [
      selectedValue,
      ...recentSymbols.filter(s => s !== selectedValue)
    ].slice(0, 5);
    setRecentSymbols(newRecent);
    localStorage.setItem('recentSymbols', JSON.stringify(newRecent));
  };

  // 직접 입력도 가능하게
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.toUpperCase();
    onChange(inputValue);
  };

  // 최근 사용한 심볼 필터링
  const recentSymbolsData = POPULAR_SYMBOLS.filter(symbol => 
    recentSymbols.includes(symbol.value)
  );

  // 인기 심볼
  const popularSymbols = POPULAR_SYMBOLS.filter(s => s.category === 'popular');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="심볼 검색..." 
            onValueChange={(search) => {
              // 검색어가 입력되면 직접 입력으로 처리
              if (search && !POPULAR_SYMBOLS.find(s => s.value.includes(search.toUpperCase()))) {
                onChange(search.toUpperCase());
              }
            }}
          />
          <CommandEmpty className="py-6 text-center text-sm">
            심볼을 찾을 수 없습니다.
          </CommandEmpty>

          {/* 최근 사용한 심볼 */}
          {recentSymbolsData.length > 0 && (
            <CommandGroup heading={
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                최근 사용
              </span>
            }>
              {recentSymbolsData.map((symbol) => (
                <CommandItem
                  key={`recent-${symbol.value}`}
                  value={symbol.value}
                  onSelect={() => handleSelect(symbol.value)}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    {symbol.label}
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === symbol.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 인기 심볼 */}
          <CommandGroup heading={
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              인기 심볼
            </span>
          }>
            {popularSymbols.map((symbol) => (
              <CommandItem
                key={`popular-${symbol.value}`}
                value={symbol.value}
                onSelect={() => handleSelect(symbol.value)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {symbol.label}
                  {symbol.category === 'popular' && (
                    <Badge variant="secondary" className="h-5 text-xs">
                      HOT
                    </Badge>
                  )}
                </span>
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === symbol.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>

          {/* 기타 심볼 */}
          <CommandGroup heading="기타 심볼">
            {POPULAR_SYMBOLS.filter(s => s.category === 'regular').map((symbol) => (
              <CommandItem
                key={symbol.value}
                value={symbol.value}
                onSelect={() => handleSelect(symbol.value)}
                className="flex items-center justify-between"
              >
                <span>{symbol.label}</span>
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === symbol.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}