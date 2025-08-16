'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Activity, Play, RotateCcw, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 타입 정의
interface BacktestStatus {
  running: boolean;
  progress: number;
  current_step: string;
  logs: string[];
  result?: {
    trades_generated: number;
    win_rate: number;
    total_return: number;
    max_drawdown: number;
    features_engineered?: string[];
    model_updated?: boolean;
  };
  error?: string;
}

interface DashboardData {
  system_status: {
    server_status: string;
    database_status: string;
    ml_models: string;
  };
  performance_summary: {
    accuracy: number;
    precision: number;
    total_trades: number;
  };
  statistics: {
    total_backtests: number;
    successful_runs: number;
    avg_accuracy: number;
  };
  recent_alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

const API_BASE = 'http://localhost:5002/api';

export default function MLMonitoringPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [backtestStatus, setBacktestStatus] = useState<BacktestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 한글 주석: 관리자 권한 체크
  useEffect(() => {
    if (!user) return;

    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }

    // 대시보드 데이터 로드
    fetchDashboardData();
    fetchBacktestStatus();

    // 백테스트 상태 폴링 (2초마다)
    const interval = setInterval(fetchBacktestStatus, 2000);
    return () => clearInterval(interval);
  }, [user, router]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('대시보드 데이터 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBacktestStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/backtest/status`);
      if (response.ok) {
        const data = await response.json();
        setBacktestStatus(data);
      }
    } catch (err) {
      console.error('백테스트 상태 로드 실패:', err);
    }
  };

  const startBacktest = async () => {
    try {
      const response = await fetch(`${API_BASE}/backtest/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'BTCUSDT',
          timeframe: '1m',
          duration: 30,
        }),
      });

      if (response.ok) {
        setError(null);
        // 상태 업데이트는 폴링으로 처리
      } else {
        const errorText = await response.text();
        setError(`백테스트 시작 실패: ${errorText}`);
      }
    } catch (err) {
      setError(`백테스트 요청 중 오류 발생: ${err}`);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>관리자 권한이 필요합니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <RotateCcw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>ML 모니터링 시스템 로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ML 모니터링 대시보드</h1>
          <p className="text-muted-foreground">관리자: {user.name}</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          관리자 모드
        </Badge>
      </div>

      {/* 시스템 상태 */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">시스템 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>서버:</span>
                <Badge variant="default">{dashboardData.system_status.server_status}</Badge>
              </div>
              <div className="flex justify-between">
                <span>데이터베이스:</span>
                <Badge variant="default">{dashboardData.system_status.database_status}</Badge>
              </div>
              <div className="flex justify-between">
                <span>ML 모델:</span>
                <Badge variant="default">{dashboardData.system_status.ml_models}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">성능 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>모델 정확도:</span>
                <strong>{(dashboardData.performance_summary.accuracy * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span>정밀도:</span>
                <strong>{(dashboardData.performance_summary.precision * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span>총 거래:</span>
                <strong>{dashboardData.performance_summary.total_trades}</strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>총 백테스트:</span>
                <strong>{dashboardData.statistics.total_backtests}</strong>
              </div>
              <div className="flex justify-between">
                <span>성공률:</span>
                <strong>{dashboardData.statistics.successful_runs}</strong>
              </div>
              <div className="flex justify-between">
                <span>평균 정확도:</span>
                <strong>{(dashboardData.statistics.avg_accuracy * 100).toFixed(1)}%</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 백테스트 & ML 훈련 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                백테스트 & ML 훈련
              </CardTitle>
              <CardDescription>
                1년간 백테스트 실행 후 자동으로 피처 엔지니어링 및 모델 훈련
              </CardDescription>
            </div>
            {!backtestStatus?.running && (
              <Button onClick={startBacktest} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                백테스트 시작
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {backtestStatus?.running && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">진행 상황</span>
                <span className="text-sm text-muted-foreground">{backtestStatus.progress}%</span>
              </div>
              <Progress value={backtestStatus.progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                현재 단계: {backtestStatus.current_step}
              </p>

              {/* 로그 출력 */}
              <div className="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium mb-2">실시간 로그</h4>
                {backtestStatus.logs.slice(-10).map((log, index) => (
                  <div key={index} className="text-xs font-mono text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {backtestStatus?.result && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">백테스트 결과</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">거래 수:</span>
                  <div className="font-medium">{backtestStatus.result.trades_generated}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">승률:</span>
                  <div className="font-medium">
                    {(backtestStatus.result.win_rate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">총 수익률:</span>
                  <div className="font-medium">
                    {backtestStatus.result.total_return?.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">최대 손실:</span>
                  <div className="font-medium">{backtestStatus.result.max_drawdown}%</div>
                </div>
              </div>

              {backtestStatus.result.features_engineered && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium mb-2">생성된 피처들</h5>
                  <div className="flex flex-wrap gap-2">
                    {backtestStatus.result.features_engineered.map((feature, index) => (
                      <Badge key={index} variant="outline">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {backtestStatus.result.model_updated && (
                <Alert className="mt-4">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>ML 모델이 새로운 데이터로 업데이트되었습니다!</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 알림 */}
      {dashboardData?.recent_alerts && dashboardData.recent_alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 알림</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dashboardData.recent_alerts.map((alert) => (
              <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
