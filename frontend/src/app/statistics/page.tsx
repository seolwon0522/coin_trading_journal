import ProfitRateChart from '@/components/statistics/profit-rate-chart';
import TimeHeatmap from '@/components/statistics/time-heatmap';
import WinRateRatioChart from '@/components/statistics/win-rate-ratio-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StatisticsPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-muted/50">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">통계</h1>
          <p className="text-muted-foreground mt-2">상세한 투자 통계를 분석하세요.</p>
        </div>
      </div>

      <div className="p-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>수익률</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitRateChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>승률 / 손익비</CardTitle>
          </CardHeader>
          <CardContent>
            <WinRateRatioChart />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>시간대별 히트맵</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeHeatmap />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
