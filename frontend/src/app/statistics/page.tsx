'use client';

import ProfitRateChart from '@/components/statistics/profit-rate-chart';
import TimeHeatmap from '@/components/statistics/time-heatmap';
import WinRateRatioChart from '@/components/statistics/win-rate-ratio-chart';
import { PageHeader } from '@/components/ui/page-header';
import { TradingCard } from '@/components/ui/trading-card';

export default function StatisticsPage() {
  return (
    <div className="min-h-full bg-[#0d0d0d]">
      <PageHeader
        title="통계"
        description="상세한 투자 통계를 분석하세요."
      />

      <div className="p-6 grid gap-4 md:grid-cols-2">
        <TradingCard>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">수익률</h3>
          </div>
          <ProfitRateChart />
        </TradingCard>

        <TradingCard>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">승률 / 손익비</h3>
          </div>
          <WinRateRatioChart />
        </TradingCard>

        <TradingCard className="md:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">시간대별 히트맵</h3>
          </div>
          <TimeHeatmap />
        </TradingCard>
      </div>
    </div>
  );
}
