'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calculator } from 'lucide-react';

/**
 * 손익 표시 컴포넌트
 * 
 * 계산된 손익과 수익률을 시각적으로 표시합니다.
 * 
 * @param profit - 손익 금액
 * @param profitPercent - 손익률 (백분율)
 * @param formatCurrency - 통화 포맷 함수
 */
interface ProfitDisplayProps {
  profit: number;
  profitPercent: number;
  formatCurrency: (value: number) => string;
}

export function ProfitDisplay({ profit, profitPercent, formatCurrency }: ProfitDisplayProps) {
  return (
    <div className={cn(
      "p-2 rounded-md flex items-center justify-between",
      profit >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
    )}>
      <span className="text-xs flex items-center gap-1">
        <Calculator className="h-3 w-3" />
        손익
      </span>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-sm font-semibold font-mono",
          profit >= 0 ? "text-green-600" : "text-red-600"
        )}>
          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
        </span>
        <Badge 
          variant={profit >= 0 ? "default" : "destructive"} 
          className="h-5 px-1 text-xs"
        >
          {profitPercent.toFixed(2)}%
        </Badge>
      </div>
    </div>
  );
}