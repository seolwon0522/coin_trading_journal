'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatNumber, parseNumber } from '@/lib/utils/number-format';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, TrendingDown, DollarSign, Hash } from 'lucide-react';
import { ProfitDisplay } from './ProfitDisplay';

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
  onFieldChange: (field: string, value: any) => void;
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
        <div className="space-y-1">
          <Label htmlFor="exitTime" className="text-xs">
            <CalendarIcon className="h-3 w-3 inline mr-1" />
            청산 시간
          </Label>
          <div className="flex gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal h-8 text-sm",
                    !exitTime && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {exitTime
                    ? format(new Date(exitTime), "yy.MM.dd HH:mm", { locale: ko })
                    : "날짜 선택"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={exitTime ? new Date(exitTime) : undefined}
                  onSelect={(date) => onFieldChange('exitTime', date ? date.toISOString() : undefined)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onSetCurrentTime}
            >
              <Clock className="h-3 w-3" />
            </Button>
          </div>
        </div>

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