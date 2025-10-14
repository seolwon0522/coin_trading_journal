'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Square,
  Activity,
  Bot,
  BarChart3,
  Settings,
  AlertTriangle,
  Plus,
  RefreshCw,
  TestTube,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  DollarSign,
  Target,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useStrategies,
  useActivateStrategy,
  useDeactivateStrategy,
  useSyncStrategy,
  useStrategyPerformance,
} from '@/hooks/useStrategies';
import { Strategy } from '@/lib/api/strategies';
import { BacktestLogViewer } from '@/components/trading/backtest-log-viewer';

export default function AutoTradingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);

  // React Query 훅 사용
  const { data: strategies = [], isLoading, error: fetchError } = useStrategies();
  const activateMutation = useActivateStrategy();
  const deactivateMutation = useDeactivateStrategy();
  const syncMutation = useSyncStrategy();

  // 선택된 전략의 성과 데이터
  const { data: performance } = useStrategyPerformance(
    selectedStrategyId || 0,
    !!selectedStrategyId
  );

  // 관리자 권한 체크
  React.useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [user, router]);

  const handleToggleStrategy = async (strategy: Strategy) => {
    if (strategy.active) {
      await deactivateMutation.mutateAsync(strategy.id);
    } else {
      await activateMutation.mutateAsync(strategy.id);
    }
  };

  const handleSync = async (strategyId: number) => {
    await syncMutation.mutateAsync(strategyId);
  };

  const getStrategyStatus = (strategy: Strategy): 'running' | 'stopped' | 'error' => {
    if (!strategy.active) return 'stopped';
    if (strategy.nautilusStrategyId) return 'running';
    return 'error';
  };

  const getStatusBadge = (status: 'running' | 'stopped' | 'error') => {
    const config = {
      running: { variant: 'default' as const, label: '실행중', icon: Zap, color: 'text-green-600' },
      stopped: { variant: 'secondary' as const, label: '정지', icon: Square, color: 'text-gray-600' },
      error: { variant: 'destructive' as const, label: '오류', icon: AlertTriangle, color: 'text-red-600' },
    };

    const { variant, label, icon: Icon, color } = config[status];

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {label}
      </Badge>
    );
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>관리자 권한이 필요합니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div>
            <p className="text-lg font-semibold">자동매매 시스템 로딩중...</p>
            <p className="text-sm text-muted-foreground">전략 데이터를 불러오고 있습니다</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId);
  const activeStrategies = strategies.filter(s => s.active).length;
  const totalTrades = strategies.reduce((sum, s) => sum + (s.totalTrades || 0), 0);
  const totalPnl = strategies.reduce((sum, s) => sum + (parseFloat(String(s.realizedPnl || 0))), 0);
  const avgWinRate = strategies.length > 0
    ? strategies.reduce((sum, s) => sum + (parseFloat(String(s.winRate || 0))), 0) / strategies.length
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">자동매매 관리</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Nautilus Trader 기반 자동매매 시스템
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="default"
              onClick={() => router.push('/admin/auto-trading/strategies/new')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              새 전략 추가
            </Button>
          </div>
        </div>

        {/* 통계 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">전체 전략</p>
                  <p className="text-3xl font-bold">{strategies.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeStrategies}개 활성
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">실행 중</p>
                  <p className="text-3xl font-bold text-green-600">{activeStrategies}</p>
                  <p className="text-xs text-muted-foreground">
                    {strategies.length - activeStrategies}개 대기
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Zap className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">총 거래</p>
                  <p className="text-3xl font-bold">{totalTrades.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    평균 {strategies.length > 0 ? Math.round(totalTrades / strategies.length) : 0}회
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <Activity className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${totalPnl >= 0 ? 'border-l-green-500' : 'border-l-red-500'} hover:shadow-md transition-shadow`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">총 손익</p>
                  <p className={`text-3xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    실현 손익
                  </p>
                </div>
                <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
                  totalPnl >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                }`}>
                  <DollarSign className={`h-7 w-7 ${
                    totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">평균 승률</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {avgWinRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    전 전략 평균
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                  <Target className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {fetchError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            데이터 로드 중 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인하세요.
          </AlertDescription>
        </Alert>
      )}

      {strategies.length === 0 && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">등록된 전략이 없습니다</p>
            <p className="text-sm text-muted-foreground mb-4">
              새로운 자동매매 전략을 추가하여 시작하세요
            </p>
            <Button onClick={() => router.push('/admin/auto-trading/strategies/new')}>
              <Plus className="h-4 w-4 mr-2" />
              첫 전략 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 전략 카드들 */}
      {strategies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">전략 목록</h2>
            <Badge variant="outline">총 {strategies.length}개</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => {
              const status = getStrategyStatus(strategy);
              const isControlling =
                activateMutation.isPending ||
                deactivateMutation.isPending ||
                syncMutation.isPending;

              return (
                <Card
                  key={strategy.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedStrategyId === strategy.id ? 'ring-2 ring-primary shadow-md' : ''
                  }`}
                  onClick={() => setSelectedStrategyId(strategy.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{strategy.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {strategy.type.replace(/_/g, ' ')} • {strategy.symbol}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(status)}
                        {strategy.testnet ? (
                          <Badge variant="outline" className="text-xs">
                            테스트넷
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs bg-blue-600">
                            실거래
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* 성과 지표 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          <span>거래</span>
                        </div>
                        <p className="text-lg font-bold">{strategy.totalTrades || 0}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="h-3 w-3" />
                          <span>승률</span>
                        </div>
                        <p className="text-lg font-bold">
                          {strategy.winRate ? (strategy.winRate * 100).toFixed(1) : '0.0'}%
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>손익</span>
                        </div>
                        <p className={`text-lg font-bold ${
                          (strategy.realizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(strategy.realizedPnl || 0) >= 0 ? '+' : ''}
                          ${(strategy.realizedPnl || 0).toFixed(2)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>수익률</span>
                        </div>
                        <p className={`text-lg font-bold ${
                          (strategy.totalReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(strategy.totalReturn || 0) >= 0 ? '+' : ''}
                          {((strategy.totalReturn || 0) * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* 제어 버튼 */}
                    <div className="flex gap-2 pt-2 border-t">
                      {status === 'running' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStrategy(strategy);
                          }}
                          disabled={isControlling}
                          className="flex-1"
                        >
                          <Square className="h-3 w-3 mr-1" />
                          정지
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStrategy(strategy);
                          }}
                          disabled={isControlling}
                          className="flex-1"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          시작
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/auto-trading/strategies/${strategy.id}/backtests`);
                        }}
                        title="백테스트"
                      >
                        <TestTube className="h-3 w-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSync(strategy.id);
                        }}
                        disabled={isControlling}
                        title="동기화"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/auto-trading/strategies/${strategy.id}`);
                        }}
                        title="설정"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 백테스팅 실시간 로그 */}
      <BacktestLogViewer enabled={true} />

      {/* 선택된 전략의 상세 정보 */}
      {selectedStrategy && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">상세 정보</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStrategyId(null)}
            >
              닫기
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 성과 분석 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  성과 분석
                </CardTitle>
                <CardDescription>{selectedStrategy.name}의 거래 성과</CardDescription>
              </CardHeader>
              <CardContent>
                {performance ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">총 거래</span>
                          <span className="font-semibold">{performance.totalTrades}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">승률</span>
                          <span className="font-semibold">{(performance.winRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">수익률</span>
                          <span className={`font-semibold ${
                            performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {performance.totalReturn >= 0 ? '+' : ''}
                            {(performance.totalReturn * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">최대 손실</span>
                          <span className="font-semibold text-red-600">
                            {(performance.maxDrawdown * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">샤프 비율</span>
                          <span className="font-semibold">{performance.sharpeRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">실현 손익</span>
                          <span className={`font-semibold ${
                            performance.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {performance.realizedPnl >= 0 ? '+' : ''}$
                            {performance.realizedPnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    성과 데이터를 불러오는 중...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 전략 파라미터 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  전략 파라미터
                </CardTitle>
                <CardDescription>현재 전략 설정</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2 pb-3 border-b">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">전략 타입</span>
                      <Badge variant="outline">{selectedStrategy.type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">심볼</span>
                      <span className="font-semibold">{selectedStrategy.symbol}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">환경</span>
                      <Badge variant={selectedStrategy.testnet ? "outline" : "default"}>
                        {selectedStrategy.testnet ? '테스트넷' : '실거래'}
                      </Badge>
                    </div>
                    {selectedStrategy.nautilusStrategyId && (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-sm text-muted-foreground">Nautilus ID</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {selectedStrategy.nautilusStrategyId}
                        </code>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">파라미터</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedStrategy.params || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-1.5 text-sm">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-mono font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
