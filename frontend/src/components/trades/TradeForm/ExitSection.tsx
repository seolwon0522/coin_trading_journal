'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DateTimeInput } from '@/components/ui/datetime-input';
import { formatNumber, parseNumber } from '@/lib/utils/number-format';
import { TrendingDown, DollarSign, Hash } from 'lucide-react';
import { ProfitDisplay } from './ProfitDisplay';
import { TradeRequest } from '@/types/trade';

/**
 * 청산 정보 섹션 컴포넌트
 * 
 * 거래 청산 시점의 가격, 수량, 시간을 입력받고 손익을 표시합니다.
 * 
 * @param exitPrice - 청산 가격
 * @param exitQuantity - 청산 수량
 * @param exitTime - 청산 시간
 * @param exitTotal - 청산 총액
 * @param profit - 손익 금액
 * @param profitPercent - 손익률
 * @param formatCurrency - 통화 포맷 함수
 * @param onFieldChange - 필드 변경 핸들러
 * @param onSetCurrentTime - 현재 시간 설정 핸들러
 */
interface ExitSectionProps {
  exitPrice?: number;
  exitQuantity?: number;
  exitTime?: string;
  exitTotal: number;
  profit: number;
  profitPercent: number;
  formatCurrency: (value: number) => string;
  onFieldChange: (field: keyof TradeRequest | string, value: any) => void;
  onSetCurrentTime: () => void;
}

export function ExitSection({ 
  exitPrice,
  exitQuantity,
  exitTime,
  exitTotal,
  profit,
  profitPercent,
  formatCurrency,
  onFieldChange,
  onSetCurrentTime
}: ExitSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-1">
        <Badge variant="outline" className="gap-1 px-2 py-0.5">
          <TrendingDown className="h-3 w-3" />
          청산 정보
        </Badge>
        <span className="text-xs text-muted-foreground">(선택)</span>
      </h3>
      
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* 청산 가격 */}
          <div className="space-y-1">
            <Label htmlFor="exitPrice" className="text-xs">
              <DollarSign className="h-3 w-3 inline mr-1" />
              청산 가격
            </Label>
            <Input
              id="exitPrice"
              type="text"
              value={exitPrice ? formatNumber(exitPrice) : ''}
              onChange={(e) => onFieldChange('exitPrice', e.target.value ? parseNumber(e.target.value) : undefined)}
              placeholder="0.00"
              className="font-mono h-8 text-sm"
            />
          </div>

          {/* 청산 수량 */}
          <div className="space-y-1">
            <Label htmlFor="exitQuantity" className="text-xs">
              <Hash className="h-3 w-3 inline mr-1" />
              청산 수량
            </Label>
            <Input
              id="exitQuantity"
              type="text"
              value={exitQuantity ? formatNumber(exitQuantity) : ''}
              onChange={(e) => onFieldChange('exitQuantity', e.target.value ? parseNumber(e.target.value) : undefined)}
              placeholder="0.00"
              className="font-mono h-8 text-sm"
            />
          </div>
        </div>

        {/* 청산 시간 */}
        <DateTimeInput
          value={exitTime || ''}
          onChange={(value) => onFieldChange('exitTime', value)}
          label="청산 시간"
        />

        {/* 수익 계산 */}
        {exitTotal > 0 && (
          <>
            <div className="p-2 bg-muted rounded-md flex items-center justify-between">
              <span className="text-xs text-muted-foreground">청산 총액</span>
              <span className="text-sm font-semibold font-mono">
                {formatCurrency(exitTotal)}
              </span>
            </div>
            <ProfitDisplay 
              profit={profit}
              profitPercent={profitPercent}
              formatCurrency={formatCurrency}
            />
          </>
        )}
      </div>
    </div>
  );
}