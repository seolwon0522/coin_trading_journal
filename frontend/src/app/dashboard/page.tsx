'use client';

import Link from 'next/link';
import {
  TrendingUp,
  Plus,
  BarChart3,
  DollarSign,
  Activity,
  Calendar,
  ArrowRight,
  Target,
  Clock,
  AlertTriangle,
  Shield,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrades } from '@/hooks/use-trades';
import { BinanceCoinSelector } from '@/components/binance-coin-selector';
import { TradingCard } from '@/components/ui/trading-card';
import { PageHeader } from '@/components/ui/page-header';

// 간단한 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <TradingCard>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {trendValue && (
            <div className="flex items-center space-x-1">
              <Badge
                variant={
                  trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'
                }
                className="text-xs h-5"
              >
                {trendValue}
              </Badge>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          )}
          {!trendValue && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="h-10 w-10 bg-[#0d0d0d] rounded-none flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </TradingCard>
  );
}

// 빠른 액션 카드 컴포넌트
function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <TradingCard className="group cursor-pointer mb-2 hover:bg-[#1a1a1a] transition-colors">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="text-xs h-5">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-1">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </TradingCard>
    </Link>
  );
}

// 최근 거래 요약 컴포넌트
function RecentTradesSummary() {
  const { trades, loading } = useTrades();

  if (loading) {
    return (
      <div>
        <TradingCard>
          <h3 className="text-sm font-semibold mb-3">최근 거래</h3>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-[#2a2a2a] rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-[#2a2a2a] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </TradingCard>
      </div>
    );
  }

  const recentTrades = trades?.slice(0, 5) || [];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">최근 거래내역</h3>
      <TradingCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">거래내역</h3>
          <Link href="/trades">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              전체 보기 <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="text-center py-6">
            <TrendingUp className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">아직 거래 기록이 없습니다</p>
            <Link href="/trades">
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">
                첫 거래 기록하기
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      trade.side === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-xs">{trade.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {trade.side === 'BUY' ? '매수' : '매도'} • {trade.entryQuantity?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">${trade.entryPrice?.toLocaleString() || '0'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </TradingCard>
    </div>
  );
}

export default function Dashboard() {
  const { trades, totalElements } = useTrades();

  // 간단한 통계 계산
  const totalTrades = totalElements || 0;
  const recentTrades = trades || [];
  const totalPnL: number = 0; // TODO: 실제 손익 계산 로직 추가
  const openPositions: number = 0; // TODO: 실제 오픈 포지션 계산
  const totalViolations: number = 0; // TODO: 위반 계산 로직 추가
  const totalPenaltyScore: number = 0;
  const riskScore: number = 100;

  return (
    <div className="h-screen bg-[#0d0d0d] flex flex-col overflow-hidden">
      {/* 페이지 타이틀 */}
      <PageHeader
        title="대시보드"
        description="매매 활동 요약과 빠른 액션 메뉴입니다."
      >
        <Badge variant="outline" className="gap-1 text-xs h-6">
          <Clock className="h-3 w-3" />
          실시간 업데이트
        </Badge>
      </PageHeader>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
          <StatCard
            title="총 거래 수"
            value={totalTrades.toString()}
            description="전체 거래 기록"
            icon={Activity}
            trend={totalTrades > 0 ? 'up' : 'neutral'}
            trendValue={totalTrades > 0 ? '+' + totalTrades : undefined}
          />

          <StatCard
            title="현재 포지션"
            value={openPositions.toString()}
            description="진행 중인 거래"
            icon={Target}
            trend={openPositions > 0 ? 'up' : 'neutral'}
          />

          <StatCard
            title="총 손익"
            value={`$${totalPnL.toLocaleString()}`}
            description="누적 손익"
            icon={DollarSign}
            trend={totalPnL > 0 ? 'up' : totalPnL < 0 ? 'down' : 'neutral'}
            trendValue={
              totalPnL !== 0 ? `${totalPnL > 0 ? '+' : ''}${totalPnL.toFixed(1)}%` : undefined
            }
          />

          <StatCard
            title="이번 달"
            value="$0"
            description="월간 손익"
            icon={Calendar}
            trend="neutral"
          />

          <StatCard
            title="위험 점수"
            value={`${riskScore.toFixed(0)}점`}
            description={`금기룰 위반 ${totalViolations}건`}
            icon={riskScore >= 80 ? Shield : AlertTriangle}
            trend={riskScore >= 80 ? 'up' : riskScore >= 60 ? 'neutral' : 'down'}
            trendValue={totalViolations > 0 ? `-${totalPenaltyScore}점` : '안전'}
          />
        </div>

        {/* 바이낸스 코인 가격 조회 */}
        <div className="mb-4">
          <BinanceCoinSelector />
        </div>

        {/* 메인 콘텐츠 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 최근 거래 (2/3) */}
          <div className="lg:col-span-2">
            <RecentTradesSummary />
          </div>

          {/* 빠른 액션 (1/3) */}
          <div>
            <h3 className="text-sm font-semibold mb-2">빠른 액션</h3>

            <div className="space-y-2">
              <QuickActionCard
                title="새 거래 기록"
                description="매수/매도 기록을 추가하세요"
                href="/trades"
                icon={Plus}
              />

              <QuickActionCard
                title="거래 통계"
                description="성과 분석 및 리포트 확인"
                href="/statistics"
                icon={BarChart3}
                badge="NEW"
              />

              <QuickActionCard
                title="월간 리포트"
                description="상세한 매매 분석 보고서"
                href="/reports"
                icon={Calendar}
              />
            </div>
          </div>
        </div>

        {/* 도움말 섹션 */}
        <TradingCard className="mt-4">
          <h3 className="text-sm font-semibold mb-2">시작하기</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <h4 className="font-medium text-foreground mb-1">1. 첫 거래 기록</h4>
              <p className="text-muted-foreground">
                매매기록 페이지에서 첫 번째 거래를 등록해보세요.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">2. 상세 분석</h4>
              <p className="text-muted-foreground">
                통계 페이지에서 매매 성과를 분석할 수 있습니다.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">3. 지속적 기록</h4>
              <p className="text-muted-foreground">꾸준한 기록으로 투자 실력을 향상시키세요.</p>
            </div>
          </div>
        </TradingCard>
      </div>
    </div>
  );
}