'use client';

import { DollarSign } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * 통화 선택 토글 컴포넌트
 * 
 * USD와 KRW 간 표시 통화를 전환합니다.
 * 
 * @param currency - 현재 선택된 통화
 * @param onCurrencyChange - 통화 변경 핸들러
 */
interface CurrencyToggleProps {
  currency: 'USD' | 'KRW';
  onCurrencyChange: (value: 'USD' | 'KRW') => void;
}

export function CurrencyToggle({ currency, onCurrencyChange }: CurrencyToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">표시 통화:</span>
      <ToggleGroup
        type="single"
        value={currency}
        onValueChange={(value: 'USD' | 'KRW') => value && onCurrencyChange(value)}
        className="h-7"
      >
        <ToggleGroupItem 
          value="USD" 
          className="h-6 px-2 text-xs data-[state=on]:bg-blue-500 data-[state=on]:text-white min-w-[50px] flex items-center justify-center gap-1"
        >
          <DollarSign className="h-3 w-3" />
          <span>USD</span>
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="KRW" 
          className="h-6 px-2 text-xs data-[state=on]:bg-blue-500 data-[state=on]:text-white min-w-[50px] flex items-center justify-center"
        >
          <span>₩ KRW</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}