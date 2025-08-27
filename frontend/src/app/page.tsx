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
    <div className="bg-card p-6 rounded-lg border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {trendValue && (
            <div className="flex items-center space-x-1">
              <Badge
                variant={
                  trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'
                }
                className="text-xs"
              >
                {trendValue}
              </Badge>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          )}
          {!trendValue && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
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
      <div className="bg-card p-6 rounded-lg border hover:shadow-md transition-all hover:border-primary/50 group cursor-pointer mb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold group-hover:text-primary transition-colors">{title}</h3>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// 최근 거래 요약 컴포넌트
function RecentTradesSummary() {
  const { trades, loading } = useTrades();

  if (loading) {
    return (
      <div>
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="font-semibold mb-4">최근 거래</h3>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const recentTrades = trades?.slice(0, 5) || [];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">최근 거래내역</h3>
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">거래내역</h3>
          <Link href="/trades">
            <Button variant="ghost" size="sm">
              전체 보기 <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">아직 거래 기록이 없습니다</p>
            <Link href="/trades">
              <Button variant="outline" size="sm" className="mt-2">
                첫 거래 기록하기
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      trade.side === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{trade.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {trade.side === 'BUY' ? '매수' : '매도'} • {trade.entryQuantity?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${trade.entryPrice?.toLocaleString() || '0'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { trades, totalElements } = useTrades();

  // 간단한 통계 계산
  const totalTrades = totalElements || 0;
  const recentTrades = trades || [];
  const totalPnL = 0; // TODO: 실제 손익 계산 로직 추가
  const openPositions = 0; // TODO: 실제 오픈 포지션 계산
  const totalViolations = 0; // TODO: 위반 계산 로직 추가
  const totalPenaltyScore = 0;
  const riskScore = 100;

  // 토큰 갱신 테스트 함수 (임시)
  const testTokenRefresh = async () => {
    try {
      const refreshToken = localStorage.getItem('ctj_refresh_token');
      console.log('Current Refresh Token:', refreshToken);
      
      const response = await fetch('http://localhost:8080/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      console.log('Token Refresh Response:', data);
      
      if (data.success) {
        alert('토큰 갱신 성공!');
        // 새 토큰 저장
        if (data.data?.accessToken && data.data?.refreshToken) {
          localStorage.setItem('ctj_access_token', data.data.accessToken);
          localStorage.setItem('ctj_refresh_token', data.data.refreshToken);
        }
      } else {
        alert('토큰 갱신 실패: ' + data.message);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      alert('토큰 갱신 오류: ' + error);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* 페이지 헤더 */}
      <div className="border-b bg-muted/50">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
              <p className="text-muted-foreground mt-2">매매 활동 요약과 빠른 액션 메뉴입니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                실시간 업데이트
              </Badge>
              {/* 임시 토큰 갱신 테스트 버튼 */}
              <Button 
                onClick={testTokenRefresh}
                variant="outline"
                size="sm"
              >
                토큰 갱신 테스트
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-6 space-y-6">
        {/* 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
        <div className="mb-6">
          <BinanceCoinSelector />
        </div>

        {/* 메인 콘텐츠 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 최근 거래 (2/3) */}
          <div className="lg:col-span-2">
            <RecentTradesSummary />
          </div>

          {/* 빠른 액션 (1/3) */}
          <div>
            <h3 className="font-semibold mb-4">빠른 액션</h3>

            <div className="space-y-6">
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
        <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-dashed">
          <h3 className="text-lg font-semibold mb-2">시작하기</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
        </div>
      </div>
    </div>
  );
}
