'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { useBacktests } from '@/hooks/useBacktests';
import { format } from 'date-fns';

export default function BacktestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [filterStrategy, setFilterStrategy] = useState<string>('all');

  const { data: backtestsData, isLoading } = useBacktests(page, 20);

  const handleViewDetail = (backtestId: number) => {
    router.push(`/admin/auto-trading/backtests/${backtestId}`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            백테스트 결과
          </h1>
          <p className="text-muted-foreground mt-1">
            전략 성과를 과거 데이터로 검증한 결과를 확인하세요
          </p>
        </div>

        <Button onClick={() => router.push('/admin/auto-trading')}>
          전략 관리로 이동
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">필터</span>
          </div>

          <Select value={filterStrategy} onValueChange={setFilterStrategy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="전략 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 전략</SelectItem>
              <SelectItem value="ema_cross">EMA Cross</SelectItem>
              <SelectItem value="rsi">RSI</SelectItem>
              <SelectItem value="bollinger_bands">Bollinger Bands</SelectItem>
              <SelectItem value="grid">Grid Trading</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Results Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      ) : !backtestsData?.content?.length ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">아직 백테스트 결과가 없습니다</h3>
          <p className="text-muted-foreground mb-4">
            전략 페이지에서 백테스트를 실행해보세요
          </p>
          <Button onClick={() => router.push('/admin/auto-trading')}>
            전략 관리로 이동
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {backtestsData.content.map((backtest) => (
            <Card
              key={backtest.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewDetail(backtest.id)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{backtest.strategyName}</h3>
                  <p className="text-sm text-muted-foreground">{backtest.symbol}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {backtest.strategyType}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {backtest.timeframe}
                  </div>
                </div>
              </div>

              {/* Period */}
              <div className="text-sm text-muted-foreground mb-4">
                {format(new Date(backtest.startDate), 'yyyy-MM-dd')} ~{' '}
                {format(new Date(backtest.endDate), 'yyyy-MM-dd')}
              </div>

              {/* Key Metrics */}
              <div className="space-y-3">
                {/* Total Return */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">총 수익률</span>
                  <span
                    className={`font-semibold flex items-center ${
                      backtest.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {backtest.totalReturn >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {backtest.totalReturn.toFixed(2)}%
                  </span>
                </div>

                {/* Win Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">승률</span>
                  <span className="font-semibold">{backtest.winRate.toFixed(2)}%</span>
                </div>

                {/* Total Trades */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">총 거래</span>
                  <span className="font-semibold">{backtest.totalTrades}</span>
                </div>

                {/* Sharpe Ratio */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">샤프 비율</span>
                  <span className="font-semibold">
                    {backtest.sharpeRatio?.toFixed(2) || 'N/A'}
                  </span>
                </div>

                {/* Total PnL */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm text-muted-foreground">총 손익</span>
                  <span
                    className={`font-bold ${
                      backtest.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ${backtest.totalPnl.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Description */}
              {backtest.description && (
                <p className="text-xs text-muted-foreground mt-4 line-clamp-2">
                  {backtest.description}
                </p>
              )}

              {/* Date */}
              <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                실행: {format(new Date(backtest.createdAt), 'yyyy-MM-dd HH:mm')}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {backtestsData && backtestsData.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            이전
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            {page + 1} / {backtestsData.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= backtestsData.totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
