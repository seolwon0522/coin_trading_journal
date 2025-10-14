'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useBacktest } from '@/hooks/useBacktests';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function BacktestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const backtestId = Number(params.id);

  const { data: backtest, isLoading } = useBacktest(backtestId);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    );
  }

  if (!backtest) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12 text-muted-foreground">
          백테스트 결과를 찾을 수 없습니다
        </div>
      </div>
    );
  }

  // Equity curve 차트 데이터 (resultData에서 추출)
  const equityData = backtest.resultData?.equity_curve || [];
  const chartData = {
    labels: equityData.map((point: any) => format(new Date(point.timestamp), 'MM/dd HH:mm')),
    datasets: [
      {
        label: '자산 가치',
        data: equityData.map((point: any) => point.equity),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '자산 가치 변화',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">백테스트 결과</h1>
          <p className="text-muted-foreground">
            {backtest.strategyName} ({backtest.symbol})
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">백테스트 정보</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">기간</span>
              <div className="font-medium">
                {format(new Date(backtest.startDate), 'yyyy-MM-dd')} ~{' '}
                {format(new Date(backtest.endDate), 'yyyy-MM-dd')}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">타임프레임</span>
              <div className="font-medium">{backtest.timeframe}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">초기 자본</span>
              <div className="font-medium">${backtest.initialCapital?.toLocaleString() || '0'}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">최종 자본</span>
              <div className="font-medium">${backtest.finalCapital?.toLocaleString() || '0'}</div>
            </div>
          </div>
        </Card>

        {/* 핵심 성과 지표 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 수익률</p>
                <p
                  className={`text-2xl font-bold flex items-center ${
                    (backtest.totalReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {(backtest.totalReturn || 0) >= 0 ? (
                    <TrendingUp className="h-5 w-5 mr-1" />
                  ) : (
                    <TrendingDown className="h-5 w-5 mr-1" />
                  )}
                  {(backtest.totalReturn || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">총 손익</p>
              <p
                className={`text-2xl font-bold ${
                  (backtest.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ${(backtest.totalPnl || 0).toFixed(2)}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">승률</p>
              <p className="text-2xl font-bold">{(backtest.winRate || 0).toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">
                {backtest.winningTrades || 0}승 / {backtest.losingTrades || 0}패
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div>
              <p className="text-sm text-muted-foreground">총 거래</p>
              <p className="text-2xl font-bold">{backtest.totalTrades || 0}</p>
            </div>
          </Card>
        </div>

        {/* 추가 성과 지표 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            상세 지표
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">최대 낙폭 (MDD)</span>
              <div className="font-semibold text-red-600">
                {backtest.maxDrawdown?.toFixed(2) || 'N/A'}%
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">샤프 비율</span>
              <div className="font-semibold">{backtest.sharpeRatio?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">평균 수익</span>
              <div className="font-semibold text-green-600">
                ${backtest.avgWin?.toFixed(2) || 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">평균 손실</span>
              <div className="font-semibold text-red-600">
                ${backtest.avgLoss?.toFixed(2) || 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">수익 팩터</span>
              <div className="font-semibold">{backtest.profitFactor?.toFixed(2) || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">최대 연속 승</span>
              <div className="font-semibold">{backtest.maxConsecutiveWins || 'N/A'}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">최대 연속 패</span>
              <div className="font-semibold">{backtest.maxConsecutiveLosses || 'N/A'}</div>
            </div>
          </div>
        </Card>

        {/* Equity Curve 차트 */}
        {equityData.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">자산 가치 곡선</h2>
            <div className="h-[400px]">
              <Line data={chartData} options={chartOptions} />
            </div>
          </Card>
        )}

        {/* 설명 */}
        {backtest.description && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">설명</h2>
            <p className="text-muted-foreground">{backtest.description}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
