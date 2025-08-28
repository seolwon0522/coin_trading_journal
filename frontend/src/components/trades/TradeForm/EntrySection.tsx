'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { formatNumber, parseNumber } from '@/lib/utils/number-format';
import { TrendingUp, DollarSign, Hash } from 'lucide-react';
import { TradeRequest } from '@/types/trade';

/**
 * 진입 정보 섹션 컴포넌트
 * 
 * 거래 진입 시점의 가격, 수량, 시간을 입력받습니다.
 * 
 * @param entryPrice - 진입 가격
 * @param entryQuantity - 진입 수량  
 * @param entryTime - 진입 시간
 * @param entryTotal - 진입 총액
 * @param formatCurrency - 통화 포맷 함수
 * @param onFieldChange - 필드 변경 핸들러
 * @param onSetCurrentTime - 현재 시간 설정 핸들러
 */
interface EntrySectionProps {
  entryPrice: number;
  entryQuantity: number;
  entryTime: string;
  entryTotal: number;
  formatCurrency: (value: number) => string;
  onFieldChange: (field: keyof TradeRequest | string, value: any) => void;
  onSetCurrentTime: () => void;
}

export function EntrySection({ 
  entryPrice,
  entryQuantity,
  entryTime,
  entryTotal,
  formatCurrency,
  onFieldChange,
  onSetCurrentTime
}: EntrySectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1">
        <Badge variant="outline" className="gap-1 px-2 py-0.5">
          <TrendingUp className="h-3 w-3" />
          진입 정보
        </Badge>
      </h3>
      
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* 진입 가격 */}
          <div className="space-y-1">
            <Label htmlFor="entryPrice" className="text-xs">
              <DollarSign className="h-3 w-3 inline mr-1" />
              진입 가격 *
            </Label>
            <Input
              id="entryPrice"
              type="text"
              value={formatNumber(entryPrice) || ''}
              onChange={(e) => onFieldChange('entryPrice', parseNumber(e.target.value))}
              placeholder="0.00"
              required
              className="font-mono h-8 text-sm"
            />
          </div>

          {/* 진입 수량 */}
          <div className="space-y-1">
            <Label htmlFor="entryQuantity" className="text-xs">
              <Hash className="h-3 w-3 inline mr-1" />
              진입 수량 *
            </Label>
            <Input
              id="entryQuantity"
              type="text"
              value={formatNumber(entryQuantity) || ''}
              onChange={(e) => onFieldChange('entryQuantity', parseNumber(e.target.value))}
              placeholder="0.00"
              required
              className="font-mono h-8 text-sm"
            />
          </div>
        </div>

        {/* 진입 시간 */}
        <DateTimeInput
          value={entryTime}
          onChange={(value) => onFieldChange('entryTime', value)}
          label="진입 시간"
          required
        />

        {/* 진입 총액 */}
        {entryTotal > 0 && (
          <div className="p-2 bg-muted rounded-md flex items-center justify-between">
            <span className="text-xs text-muted-foreground">진입 총액</span>
            <span className="text-sm font-semibold font-mono">
              {formatCurrency(entryTotal)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}