'use client';

import { useState } from 'react';
import { Plus, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TradeForm } from '@/components/trades/TradeForm/index';
import { TradesTable } from '@/components/trades/TradesTable';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ExchangeRateBadge } from '@/components/ui/exchange-rate-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTrades } from '@/hooks/use-trades';

export default function TradesPage() {
  const [showForm, setShowForm] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'KRW'>('USD');
  const router = useRouter();
  const { createTrade } = useTrades();

  const handleFormSubmit = async (data: any) => {
    await createTrade(data);
    setShowForm(false);
  };

  const handleGoToStatistics = () => {
    router.push('/statistics');
  };

  return (
    <div className="min-h-full bg-background">
      {/* 페이지 헤더 */}
      <div className="border-b bg-muted/50">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-8 w-8" />
                매매 기록
              </h1>
              <p className="text-muted-foreground mt-2">
                거래 내역을 체계적으로 기록하고 관리하세요.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <ExchangeRateBadge />
                <ToggleGroup
                  type="single"
                  value={currency}
                  onValueChange={(value: 'USD' | 'KRW') => value && setCurrency(value)}
                  className="h-8"
                >
                  <ToggleGroupItem value="USD" className="h-7 px-3 text-xs data-[state=on]:bg-blue-500 data-[state=on]:text-white min-w-[60px] flex items-center justify-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>USD</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="KRW" className="h-7 px-3 text-xs data-[state=on]:bg-blue-500 data-[state=on]:text-white min-w-[60px] flex items-center justify-center">
                    <span>₩ KRW</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGoToStatistics} className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  통계 보기
                </Button>
                <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  새 기록 추가
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-6 space-y-6">
        {/* 거래 테이블 */}
        <TradesTable currency={currency} />
      </div>

      {/* 거래 등록 다이얼로그 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              새 거래 등록
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              거래 정보를 입력하여 포트폴리오에 추가하세요.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <TradeForm
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}