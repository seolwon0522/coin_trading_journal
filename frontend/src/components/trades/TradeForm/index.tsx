'use client';

import React, { useState, useEffect } from 'react';
import { Trade, TradeRequest } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BinanceSymbolSelector } from '../BinanceSymbolSelector';
import { formatNumber } from '@/lib/utils/number-format';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { CurrencyToggle } from './CurrencyToggle';
import { EntrySection } from './EntrySection';
import { ExitSection } from './ExitSection';

/**
 * 거래 정보 입력/수정 폼 컴포넌트
 * 
 * @param trade - 수정 모드일 때 기존 거래 데이터
 * @param onSubmit - 폼 제출 핸들러
 * @param onCancel - 취소 핸들러
 */
interface TradeFormProps {
  trade?: Trade;
  onSubmit: (data: TradeRequest) => Promise<void>;
  onCancel: () => void;
}

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
    
    // 필수 필드 검증
    if (!formData.symbol || !formData.entryPrice || !formData.entryQuantity || !formData.entryTime) {
      toast.error('필수 항목을 모두 입력해주세요.', {
        icon: <AlertCircle className="h-4 w-4" />,
        description: '심볼, 진입가격, 진입수량, 진입시간은 필수입니다.',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await onSubmit(formData);
      toast.success(trade ? '거래가 수정되었습니다.' : '거래가 등록되었습니다.', {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      onCancel(); // 성공 시 폼 닫기
    } catch (error) {
      console.error('Trade submission error:', error);
      toast.error('거래 저장에 실패했습니다.', {
        icon: <AlertCircle className="h-4 w-4" />,
        description: error instanceof Error ? error.message : '입력값을 확인해주세요.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof TradeRequest | string, value: any) => {
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
          <CurrencyToggle 
            currency={currency}
            onCurrencyChange={setCurrency}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 진입 정보 */}
          <EntrySection
            entryPrice={formData.entryPrice || 0}
            entryQuantity={formData.entryQuantity || 0}
            entryTime={formData.entryTime || ''}
            entryTotal={calculations.entryTotal}
            formatCurrency={formatCurrency}
            onFieldChange={handleChange}
            onSetCurrentTime={() => setCurrentTime('entryTime')}
          />

          {/* 청산 정보 */}
          <ExitSection
            exitPrice={formData.exitPrice}
            exitQuantity={formData.exitQuantity}
            exitTime={formData.exitTime}
            exitTotal={calculations.exitTotal}
            profit={calculations.profit}
            profitPercent={calculations.profitPercent}
            formatCurrency={formatCurrency}
            onFieldChange={handleChange}
            onSetCurrentTime={() => setCurrentTime('exitTime')}
          />
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