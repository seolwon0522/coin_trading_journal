'use client';

import React, { useState, useEffect } from 'react';
import { Trade, TradeRequest } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BinanceSymbolSelector } from './BinanceSymbolSelector';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import {
  CalendarIcon,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Hash,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface TradeFormProps {
  trade?: Trade;
  onSubmit: (data: TradeRequest) => Promise<void>;
  onCancel: () => void;
}

// 숫자 포맷팅 함수
const formatNumber = (value: number | undefined): string => {
  if (!value) return '';
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 8,
  }).format(value);
};

// 숫자 파싱 함수
const parseNumber = (value: string): number => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

export function TradeForm({ trade, onSubmit, onCancel }: TradeFormProps) {
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'KRW'>('USD');
  const { usdToKrw, formatKRW } = useExchangeRate();
  const [formData, setFormData] = useState<TradeRequest>({
    symbol: trade?.symbol || '',
    side: trade?.side || 'BUY',
    entryPrice: trade?.entryPrice || 0,
    entryQuantity: trade?.entryQuantity || 0,
    entryTime: trade?.entryTime || new Date().toISOString(),
    exitPrice: trade?.exitPrice,
    exitQuantity: trade?.exitQuantity,
    exitTime: trade?.exitTime,
    notes: trade?.notes || '',
  });

  // 계산된 값들
  const [calculations, setCalculations] = useState({
    entryTotal: 0,
    exitTotal: 0,
    profit: 0,
    profitPercent: 0,
  });

  // 실시간 계산
  useEffect(() => {
    const entryTotal = (formData.entryPrice || 0) * (formData.entryQuantity || 0);
    const exitTotal = (formData.exitPrice || 0) * (formData.exitQuantity || 0);
    const profit = exitTotal - entryTotal;
    const profitPercent = entryTotal > 0 ? (profit / entryTotal) * 100 : 0;

    setCalculations({
      entryTotal,
      exitTotal,
      profit,
      profitPercent,
    });
  }, [formData.entryPrice, formData.entryQuantity, formData.exitPrice, formData.exitQuantity]);

  // 통화 표시 형식 함수
  const formatCurrency = (value: number): string => {
    if (currency === 'USD') {
      return `$${formatNumber(value)}`;
    } else {
      return formatKRW(usdToKrw(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
      toast.success(trade ? '거래가 수정되었습니다.' : '거래가 등록되었습니다.', {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      onCancel(); // 성공 시 폼 닫기
    } catch {
      toast.error('거래 저장에 실패했습니다.', {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof TradeRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 현재 시간 설정 함수
  const setCurrentTime = (field: 'entryTime' | 'exitTime') => {
    handleChange(field, new Date().toISOString());
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* 심볼 & 매수/매도 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 심볼 선택 */}
          <div className="space-y-1">
            <Label htmlFor="symbol" className="text-sm flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              심볼 *
            </Label>
            <BinanceSymbolSelector
              value={formData.symbol}
              onChange={(value) => handleChange('symbol', value)}
              placeholder="심볼 선택..."
              className="w-full"
            />
          </div>

          {/* 매수/매도 토글 */}
          <div className="space-y-1">
            <Label className="text-sm flex items-center gap-1">
              <ArrowUpCircle className="h-3 w-3" />
              거래 방향 *
            </Label>
            <ToggleGroup
              type="single"
              value={formData.side}
              onValueChange={(value: 'BUY' | 'SELL') => value && handleChange('side', value)}
              className="w-full"
            >
              <ToggleGroupItem
                value="BUY"
                className={cn(
                  "flex-1 data-[state=on]:bg-green-500 data-[state=on]:text-white",
                  "hover:bg-green-100 transition-colors"
                )}
              >
                <ArrowUpCircle className="h-4 w-4 mr-1" />
                매수
              </ToggleGroupItem>
              <ToggleGroupItem
                value="SELL"
                className={cn(
                  "flex-1 data-[state=on]:bg-red-500 data-[state=on]:text-white",
                  "hover:bg-red-100 transition-colors"
                )}
              >
                <ArrowDownCircle className="h-4 w-4 mr-1" />
                매도
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <Separator />

        {/* 통화 선택 및 진입 & 청산 정보 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">거래 정보</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">표시 통화:</span>
            <ToggleGroup
              type="single"
              value={currency}
              onValueChange={(value: 'USD' | 'KRW') => value && setCurrency(value)}
              className="h-7"
            >
              <ToggleGroupItem value="USD" className="h-6 px-2 text-xs data-[state=on]:bg-blue-500 data-[state=on]:text-white min-w-[50px] flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>USD</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="KRW" className="h-6 px-2 text-xs data-[state=on]:bg-blue-500 data-[state=on]:text-white min-w-[50px] flex items-center justify-center">
                <span>₩ KRW</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 진입 정보 */}
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
                    value={formatNumber(formData.entryPrice) || ''}
                    onChange={(e) => handleChange('entryPrice', parseNumber(e.target.value))}
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
                    value={formatNumber(formData.entryQuantity) || ''}
                    onChange={(e) => handleChange('entryQuantity', parseNumber(e.target.value))}
                    placeholder="0.00"
                    required
                    className="font-mono h-8 text-sm"
                  />
                </div>
              </div>

              {/* 진입 시간 */}
              <div className="space-y-1">
                <Label htmlFor="entryTime" className="text-xs">
                  <CalendarIcon className="h-3 w-3 inline mr-1" />
                  진입 시간 *
                </Label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal h-8 text-sm",
                          !formData.entryTime && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {formData.entryTime
                          ? format(new Date(formData.entryTime), "yy.MM.dd HH:mm", { locale: ko })
                          : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.entryTime ? new Date(formData.entryTime) : undefined}
                        onSelect={(date) => date && handleChange('entryTime', date.toISOString())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentTime('entryTime')}
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* 진입 총액 */}
              {calculations.entryTotal > 0 && (
                <div className="p-2 bg-muted rounded-md flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">진입 총액</span>
                  <span className="text-sm font-semibold font-mono">
                    {formatCurrency(calculations.entryTotal)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 청산 정보 */}
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
                    value={formData.exitPrice ? formatNumber(formData.exitPrice) : ''}
                    onChange={(e) => handleChange('exitPrice', e.target.value ? parseNumber(e.target.value) : undefined)}
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
                    value={formData.exitQuantity ? formatNumber(formData.exitQuantity) : ''}
                    onChange={(e) => handleChange('exitQuantity', e.target.value ? parseNumber(e.target.value) : undefined)}
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
                          !formData.exitTime && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {formData.exitTime
                          ? format(new Date(formData.exitTime), "yy.MM.dd HH:mm", { locale: ko })
                          : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.exitTime ? new Date(formData.exitTime) : undefined}
                        onSelect={(date) => date && handleChange('exitTime', date ? date.toISOString() : undefined)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentTime('exitTime')}
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* 수익 계산 */}
              {calculations.exitTotal > 0 && (
                <>
                  <div className="p-2 bg-muted rounded-md flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">청산 총액</span>
                    <span className="text-sm font-semibold font-mono">
                      {formatCurrency(calculations.exitTotal)}
                    </span>
                  </div>
                  <div className={cn(
                    "p-2 rounded-md flex items-center justify-between",
                    calculations.profit >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                  )}>
                    <span className="text-xs flex items-center gap-1">
                      <Calculator className="h-3 w-3" />
                      손익
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-semibold font-mono",
                        calculations.profit >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {calculations.profit >= 0 ? '+' : ''}{formatCurrency(calculations.profit)}
                      </span>
                      <Badge 
                        variant={calculations.profit >= 0 ? "default" : "destructive"} 
                        className="h-5 px-1 text-xs"
                      >
                        {calculations.profitPercent.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* 메모 */}
        <div className="space-y-1">
          <Label htmlFor="notes" className="text-sm flex items-center gap-1">
            <FileText className="h-3 w-3" />
            메모
          </Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="거래 전략, 시장 상황, 배운 점 등을 기록하세요..."
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 pt-2">
          <Button 
            type="submit" 
            disabled={loading} 
            className="flex-1 gap-1 h-9"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                처리중...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" />
                {trade ? '수정' : '등록'}
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={loading}
            className="gap-1 h-9"
          >
            취소
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}