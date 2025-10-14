'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Play, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useRunBacktest, useBacktestsByStrategy, useDeleteBacktest } from '@/hooks/useBacktests';
import { BacktestRequest } from '@/lib/api/backtests';
import { format } from 'date-fns';

export default function StrategyBacktestsPage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = Number(params.id);

  const [formData, setFormData] = useState<BacktestRequest>({
    strategyId,
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    initialCapital: 10000,
    timeframe: '1m',
  });

  const runBacktestMutation = useRunBacktest();
  const { data: backtestsData, isLoading } = useBacktestsByStrategy(strategyId, 0, 20);
  const deleteBacktestMutation = useDeleteBacktest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runBacktestMutation.mutateAsync(formData);
  };

  const handleDelete = async (backtestId: number) => {
    if (confirm('백테스트 결과를 삭제하시겠습니까?')) {
      await deleteBacktestMutation.mutateAsync(backtestId);
    }
  };

  const handleViewDetail = (backtestId: number) => {
    router.push(`/admin/auto-trading/backtests/${backtestId}`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">백테스트</h1>
          <p className="text-muted-foreground">전략 성과를 과거 데이터로 검증하세요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 백테스트 실행 폼 */}
        <Card className="lg:col-span-1 p-6">
          <h2 className="text-xl font-semibold mb-4">새 백테스트 실행</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="initialCapital">초기 자본 (USDT)</Label>
              <Input
                id="initialCapital"
                type="number"
                min="100"
                step="100"
                value={formData.initialCapital}
                onChange={(e) =>
                  setFormData({ ...formData, initialCapital: Number(e.target.value) })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="timeframe">타임프레임</Label>
              <Select
                value={formData.timeframe}
                onValueChange={(value) => setFormData({ ...formData, timeframe: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1분</SelectItem>
                  <SelectItem value="5m">5분</SelectItem>
                  <SelectItem value="15m">15분</SelectItem>
                  <SelectItem value="30m">30분</SelectItem>
                  <SelectItem value="1h">1시간</SelectItem>
                  <SelectItem value="4h">4시간</SelectItem>
                  <SelectItem value="1d">1일</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">설명 (선택)</Label>
              <Input
                id="description"
                placeholder="백테스트 설명"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={runBacktestMutation.isPending}
            >
              {runBacktestMutation.isPending ? (
                <>실행 중...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  백테스트 실행
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* 백테스트 이력 */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-xl font-semibold mb-4">백테스트 이력</h2>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : !backtestsData?.content?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              아직 백테스트 결과가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {backtestsData.content.map((backtest) => (
                <div
                  key={backtest.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleViewDetail(backtest.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(backtest.startDate), 'yyyy-MM-dd')} ~{' '}
                        {format(new Date(backtest.endDate), 'yyyy-MM-dd')}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({backtest.timeframe})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(backtest.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">총 수익률</span>
                      <div
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
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">승률</span>
                      <div className="font-semibold">{backtest.winRate.toFixed(2)}%</div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">총 거래</span>
                      <div className="font-semibold">{backtest.totalTrades}</div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">샤프 비율</span>
                      <div className="font-semibold">
                        {backtest.sharpeRatio?.toFixed(2) || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {backtest.description && (
                    <p className="text-sm text-muted-foreground mt-2">{backtest.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
