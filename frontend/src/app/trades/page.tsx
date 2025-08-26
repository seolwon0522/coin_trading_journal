'use client';

import { useState } from 'react';
import { Plus, BarChart3, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TradeForm } from '@/components/trades/TradeForm';
import { TradesTable } from '@/components/trades/TradesTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTrades } from '@/hooks/use-trades';

export default function TradesPage() {
  const [showForm, setShowForm] = useState(false);
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

      {/* 메인 콘텐츠 */}
      <div className="p-6 space-y-6">
        {/* 거래 테이블 */}
        <TradesTable />
      </div>

      {/* 거래 등록 다이얼로그 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>새 거래 등록</DialogTitle>
          </DialogHeader>
          <TradeForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}