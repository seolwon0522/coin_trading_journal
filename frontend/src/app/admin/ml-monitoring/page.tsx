'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, RotateCcw, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 타입 정의
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

interface ContinuousBacktestStatus {
  running: boolean;
  auto_enabled: boolean;
  current_period: string | null;
  total_periods: number;
  completed_periods: number;
  start_date: string;
  current_date: string | null;
  interval_minutes: number;
  results_history: BacktestResult[];
  comparison_data: unknown[];
  last_comparison: unknown;
  changes_detected: ChangeDetection[];
  ml_metrics?: {
    latest_r2_score: number | null;
    latest_accuracy: number | null;
    latest_precision: number | null;
    latest_recall: number | null;
    latest_f1_score: number | null;
    model_last_trained: string | null;
    training_samples: number | null;
    feature_count: number | null;
  };
}

interface BacktestResult {
  period: string;
  trades_count: number;
  win_rate: number;
  total_pnl: number;
  avg_trade_duration: number;
  max_drawdown: number;
  timestamp: string;
}

interface ChangeDetection {
  period: string;
  changes: string[];
  timestamp: string;
}

// 한글 주석: 자동매매 봇 타입
interface TradingBot {
  id: string;
  name: string;
  status: 'stopped' | 'running' | 'paused' | 'error';
  strategy: string;
  symbol: string;
  balance: number;
  current_pnl: number;
  total_trades: number;
  win_rate: number;
  last_updated: string;
  is_live?: boolean;
  testnet?: boolean;
  features?: Record<string, number>;
  model_performance?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    last_trained?: string;
  };
}

// 한글 주석: 자동매매 1분 스냅샷 타입
interface AutoTradeSnapshot {
  timestamp: string;
  balance: number;
  pnl: number;
  pnl_percentage: number;
  trades_count: number;
  win_rate?: number;
  is_live: boolean;
  testnet?: boolean;
}

const API_BASE = 'http://localhost:5002/api';
const LOCAL_SNAPSHOT_KEY = 'ml_auto_trade_snapshots';

export default function MLMonitoringPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [continuousStatus, setContinuousStatus] = useState<ContinuousBacktestStatus | null>(null);
  const [autoTradeSnapshots, setAutoTradeSnapshots] = useState<AutoTradeSnapshot[]>([]);
  const [botStatus, setBotStatus] = useState<
    'running' | 'stopped' | 'paused' | 'error' | 'unknown'
  >('unknown');

  // 한글 주석: 관리자 권한 체크는 아래 useEffect에서 수행

  const fetchDashboardData = useCallback(async () => {
    try {
      if (!continuousStatus) return;

      // 한글 주석: 연속 백테스팅 데이터에서 실제 통계 계산
      const results = continuousStatus.results_history || [];
      const recentResults = results.slice(-10); // 최근 10개

      if (recentResults.length === 0) {
        setDashboardData({
          system_status: {
            server_status: '실행 중',
            database_status: '연결됨',
            ml_models: '대기 중',
          },
          performance_summary: {
            accuracy: 0,
            precision: 0,
            total_trades: 0,
          },
          statistics: {
            total_backtests: 0,
            successful_runs: 0,
            avg_accuracy: 0,
          },
          recent_alerts: [],
        });
        return;
      }

      // 한글 주석: 실제 데이터 계산
      const totalTrades = recentResults.reduce((sum, result) => sum + result.trades_count, 0);
      const avgWinRate =
        recentResults.reduce((sum, result) => sum + result.win_rate, 0) / recentResults.length;
      const successfulRuns = recentResults.filter((result) => result.trades_count > 0).length;

      setDashboardData({
        system_status: {
          server_status: continuousStatus.running ? '실행 중' : '대기',
          database_status: '연결됨',
          ml_models: continuousStatus.auto_enabled ? '활성' : '비활성',
        },
        performance_summary: {
          accuracy: avgWinRate,
          precision: avgWinRate * 0.9, // 승률 기반 추정
          total_trades: totalTrades,
        },
        statistics: {
          total_backtests: continuousStatus.completed_periods || 0,
          successful_runs: successfulRuns,
          avg_accuracy: avgWinRate,
        },
        recent_alerts:
          continuousStatus.changes_detected?.slice(-3).map((change, index) => ({
            id: `alert_${index}`,
            type: 'info' as const,
            message: `${change.period}: ${change.changes.join(', ')}`,
          })) || [],
      });
    } catch (err) {
      console.error('대시보드 데이터 계산 실패:', err);
    }
  }, [continuousStatus]);

  const updateDashboardFromContinuousData = useCallback(
    (continuousData: ContinuousBacktestStatus) => {
      const results = continuousData.results_history || [];
      const recentResults = results.slice(-10); // 최근 10개

      if (recentResults.length === 0) return;

      // 한글 주석: 실제 데이터 계산
      const totalTrades = recentResults.reduce((sum, result) => sum + result.trades_count, 0);
      const avgWinRate =
        recentResults.reduce((sum, result) => sum + result.win_rate, 0) / recentResults.length;
      const successfulRuns = recentResults.filter((result) => result.trades_count > 0).length;

      setDashboardData({
        system_status: {
          server_status: continuousData.running ? '실행 중' : '대기',
          database_status: '연결됨',
          ml_models: continuousData.auto_enabled ? '활성' : '비활성',
        },
        performance_summary: {
          accuracy: avgWinRate,
          precision: avgWinRate * 0.9, // 승률 기반 추정
          total_trades: totalTrades,
        },
        statistics: {
          total_backtests: continuousData.completed_periods || 0,
          successful_runs: successfulRuns,
          avg_accuracy: avgWinRate,
        },
        recent_alerts:
          continuousData.changes_detected?.slice(-3).map((change, index) => ({
            id: `alert_${index}`,
            type: 'info' as const,
            message: `${change.period}: ${change.changes.join(', ')}`,
          })) || [],
      });
    },
    []
  );

  const fetchContinuousStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/continuous-backtest/status`);
      if (response.ok) {
        const data = await response.json();
        setContinuousStatus(data);
        // 한글 주석: 연속 백테스팅 데이터가 업데이트되면 대시보드도 업데이트
        if (data.results_history && data.results_history.length > 0) {
          updateDashboardFromContinuousData(data);
        }
      }
    } catch (err) {
      console.error('연속 백테스트 상태 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [updateDashboardFromContinuousData]);

  // 한글 주석: 관리자 권한 체크 및 데이터 로딩/폴링
  useEffect(() => {
    if (!user) return;

    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }

    // 대시보드 데이터 로드
    // 한글 주석: 초기에도 서버 상태를 기반으로 대시보드 생성 시도
    fetchContinuousStatus();
    // fetchDashboardData는 서버 상태 반영 후 계산되므로 중복 호출 제거

    // 상태 폴링 (15초마다로 완화)
    const interval = setInterval(() => {
      fetchContinuousStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [user, router, fetchContinuousStatus, fetchDashboardData]);

  // 한글 주석: 자동매매 봇 상태 확인 및 필요 시 시작
  const ensureAutoTradingBotStarted = useCallback(async () => {
    try {
      // 한글 주석: 네트워크 오류/지연 대비 타임아웃과 헬스 체크 추가
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const health = await fetch(`${API_BASE.replace(/\/$/, '')}/health`, {
        signal: controller.signal,
      }).catch(() => null);
      if (!health || !health.ok) {
        setBotStatus('unknown');
        clearTimeout(timeoutId);
        return;
      }

      const res = await fetch(`${API_BASE}/trading/bots`, { signal: controller.signal });
      if (!res.ok) {
        setBotStatus('unknown');
        clearTimeout(timeoutId);
        return;
      }
      let bots: TradingBot[] = [];
      try {
        bots = await res.json();
      } catch {
        setBotStatus('unknown');
        clearTimeout(timeoutId);
        return;
      }

      const mainBot = Array.isArray(bots) ? bots.find((b) => b.id === 'main_bot') : null;
      const status = mainBot?.status ?? 'stopped';
      setBotStatus(status ?? 'unknown');
      if (status !== 'running') {
        const startRes = await fetch(`${API_BASE}/trading/bots/main_bot/start`, {
          method: 'POST',
          signal: controller.signal,
        }).catch(() => null);
        if (startRes && startRes.ok) {
          setBotStatus('running');
        }
      }
      clearTimeout(timeoutId);
    } catch (err) {
      console.error('자동매매 봇 시작 확인 실패:', err);
    }
  }, []);

  // 한글 주석: 자동매매 성과를 1분 간격으로 스냅샷 수집
  const fetchAndRecordAutoTradingPerformance = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/trading/performance/main_bot`);
      if (!res.ok) return;
      const data = await res.json();

      // 한글 주석: 응답에서 요약/테이블 데이터를 활용하여 스냅샷 생성
      const nowIso = new Date().toISOString();
      if (data.is_live_data) {
        const summary = data.summary || {};
        const snapshot: AutoTradeSnapshot = {
          timestamp: nowIso,
          balance: Number(summary.account_value ?? 0),
          pnl: Number(summary.total_pnl ?? 0),
          pnl_percentage: Number(summary.total_pnl_percentage ?? 0),
          trades_count: Number(summary.total_trades ?? 0),
          is_live: true,
          testnet: data.testnet ?? true,
        };
        setAutoTradeSnapshots((prev) => [...prev.slice(-59), snapshot]);
      } else {
        const last =
          Array.isArray(data.performance_data) && data.performance_data.length > 0
            ? data.performance_data[data.performance_data.length - 1]
            : null;
        if (last) {
          const snapshot: AutoTradeSnapshot = {
            timestamp: nowIso,
            balance: Number(last.balance ?? 0),
            pnl: Number(last.pnl ?? 0),
            pnl_percentage: Number(last.pnl_percentage ?? 0),
            trades_count: Number(last.trades_count ?? 0),
            win_rate: typeof last.win_rate === 'number' ? last.win_rate : undefined,
            is_live: false,
          };
          setAutoTradeSnapshots((prev) => [...prev.slice(-59), snapshot]);
        }
      }
    } catch (err) {
      console.error('자동매매 성과 스냅샷 수집 실패:', err);
    }
  }, []);

  // 한글 주석: 관리자 진입 시 자동매매 시작 보장 및 1분 스냅샷 수집 타이머 설정
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    ensureAutoTradingBotStarted();
    fetchAndRecordAutoTradingPerformance();
    const t = setInterval(() => {
      fetchAndRecordAutoTradingPerformance();
    }, 120_000); // 2분 간격으로 완화
    return () => clearInterval(t);
  }, [user, ensureAutoTradingBotStarted, fetchAndRecordAutoTradingPerformance]);

  // 한글 주석: 스냅샷 로컬 스토리지에서 복원 (새로고침 시 유지)
  useEffect(() => {
    try {
      const raw =
        typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_SNAPSHOT_KEY) : null;
      if (!raw) return;
      const parsed: AutoTradeSnapshot[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setAutoTradeSnapshots(parsed.slice(-60)); // 최근 60개만 유지
      }
    } catch {
      // 무시: 파싱 실패 시 초기화
    }
  }, []);

  // 한글 주석: 스냅샷 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        LOCAL_SNAPSHOT_KEY,
        JSON.stringify(autoTradeSnapshots.slice(-60))
      );
    } catch {
      // 저장 실패는 무시 (사파리 프라이빗 모드 등)
    }
  }, [autoTradeSnapshots]);

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

      {/* 시스템 상태 - 실제 데이터 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">시스템 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>서버:</span>
              <Badge variant="default">
                {dashboardData?.system_status.server_status ||
                  (continuousStatus?.running ? '실행 중' : '대기')}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>데이터베이스:</span>
              <Badge variant="default">
                {dashboardData?.system_status.database_status || '연결됨'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>ML 모델:</span>
              <Badge variant="default">
                {dashboardData?.system_status.ml_models ||
                  (continuousStatus?.auto_enabled ? '활성' : '비활성')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">성능 요약 (실제 데이터)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>평균 승률:</span>
              <strong>
                {dashboardData !== null && dashboardData !== undefined
                  ? (dashboardData.performance_summary.accuracy * 100).toFixed(1) + '%'
                  : '계산 중...'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>예상 정밀도:</span>
              <strong>
                {dashboardData !== null && dashboardData !== undefined
                  ? (dashboardData.performance_summary.precision * 100).toFixed(1) + '%'
                  : '계산 중...'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>총 거래:</span>
              <strong>{dashboardData?.performance_summary.total_trades || 0}</strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">백테스트 통계 (실제 데이터)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>완료된 기간:</span>
              <strong>
                {dashboardData?.statistics.total_backtests ||
                  continuousStatus?.completed_periods ||
                  0}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>성공한 백테스트:</span>
              <strong>{dashboardData?.statistics.successful_runs || 0}</strong>
            </div>
            <div className="flex justify-between">
              <span>평균 승률:</span>
              <strong>
                {dashboardData !== null && dashboardData !== undefined
                  ? (dashboardData.statistics.avg_accuracy * 100).toFixed(1) + '%'
                  : '계산 중...'}
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* ML 모델 평가 지표 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ML 모델 평가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>R² 스코어:</span>
              <strong
                className={
                  (continuousStatus?.ml_metrics?.latest_r2_score ?? 0) > 0.5
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {continuousStatus?.ml_metrics?.latest_r2_score?.toFixed(3) ?? '학습 대기 중'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>정확도:</span>
              <strong>
                {continuousStatus?.ml_metrics?.latest_accuracy
                  ? (continuousStatus.ml_metrics.latest_accuracy * 100).toFixed(1) + '%'
                  : '학습 대기 중'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>F1 스코어:</span>
              <strong>
                {continuousStatus?.ml_metrics?.latest_f1_score
                  ? continuousStatus.ml_metrics.latest_f1_score.toFixed(3)
                  : '학습 대기 중'}
              </strong>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {continuousStatus?.ml_metrics?.model_last_trained
                ? `마지막 학습: ${new Date(continuousStatus.ml_metrics.model_last_trained).toLocaleDateString('ko-KR')}`
                : '아직 학습되지 않음'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 연속 백테스팅 시스템 */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              연속 백테스팅 시스템
            </CardTitle>
            <CardDescription>
              2016년부터 1분 간격으로 자동 백테스팅 실행 및 변화 감지 (자동 실행)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 한글 주석: 연속 백테스팅 상태 표시 */}
          {continuousStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">현재 상태</div>
                <div className="font-medium">
                  {continuousStatus.running ? (
                    <span className="text-green-600">실행 중</span>
                  ) : (
                    <span className="text-gray-500">중단됨</span>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">완료된 기간</div>
                <div className="font-medium">{continuousStatus.completed_periods}개</div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">현재 기간</div>
                <div className="font-medium text-xs">
                  {continuousStatus.current_period || '대기 중'}
                </div>
              </div>
            </div>
          )}

          {/* 한글 주석: 감지된 변화 목록 */}
          {continuousStatus?.changes_detected && continuousStatus.changes_detected.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                최근 감지된 변화
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {continuousStatus.changes_detected.slice(-10).map((change, index) => (
                  <div key={index} className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">
                      {change.period} ({new Date(change.timestamp).toLocaleTimeString('ko-KR')})
                    </div>
                    <div className="space-y-1">
                      {change.changes.map((changeText, changeIndex) => (
                        <div key={changeIndex} className="text-sm font-medium text-amber-800">
                          • {changeText}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 한글 주석: 백테스트 결과 히스토리 요약 */}
          {continuousStatus?.results_history && continuousStatus.results_history.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">백테스트 결과 히스토리 (최근 10개)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">기간</th>
                      <th className="text-left p-2">거래 수</th>
                      <th className="text-left p-2">승률</th>
                      <th className="text-left p-2">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {continuousStatus.results_history.slice(-10).map((result, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 text-xs">{result.period}</td>
                        <td className="p-2">{result.trades_count}</td>
                        <td className="p-2">
                          <span
                            className={
                              result.win_rate > 0.6
                                ? 'text-green-600'
                                : result.win_rate < 0.4
                                  ? 'text-red-600'
                                  : ''
                            }
                          >
                            {(result.win_rate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={
                              result.total_pnl > 0
                                ? 'text-green-600'
                                : result.total_pnl < 0
                                  ? 'text-red-600'
                                  : ''
                            }
                          >
                            {result.total_pnl.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 알림 - 실제 데이터 */}
      {dashboardData?.recent_alerts && dashboardData.recent_alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 변화 감지</CardTitle>
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

      {/* 자동매매 결과 (1분 스냅샷) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">자동매매 결과 (1분 스냅샷)</CardTitle>
            <Badge variant="secondary">
              봇 상태: {botStatus === 'unknown' ? '확인 중' : botStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {autoTradeSnapshots.length === 0 ? (
            <div className="text-sm text-muted-foreground">아직 수집된 스냅샷이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">시간</th>
                    <th className="text-left p-2">잔고</th>
                    <th className="text-left p-2">PnL</th>
                    <th className="text-left p-2">PnL%</th>
                    <th className="text-left p-2">거래 수</th>
                    <th className="text-left p-2">모드</th>
                  </tr>
                </thead>
                <tbody>
                  {[...autoTradeSnapshots]
                    .slice(-20)
                    .reverse()
                    .map((s, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 text-xs">
                          {new Date(s.timestamp).toLocaleTimeString('ko-KR')}
                        </td>
                        <td className="p-2">{s.balance.toFixed(2)}</td>
                        <td
                          className={`p-2 ${s.pnl > 0 ? 'text-green-600' : s.pnl < 0 ? 'text-red-600' : ''}`}
                        >
                          {s.pnl.toFixed(2)}
                        </td>
                        <td
                          className={`p-2 ${s.pnl_percentage > 0 ? 'text-green-600' : s.pnl_percentage < 0 ? 'text-red-600' : ''}`}
                        >
                          {s.pnl_percentage.toFixed(2)}%
                        </td>
                        <td className="p-2">{s.trades_count}</td>
                        <td className="p-2 text-xs">
                          {s.is_live ? (s.testnet ? 'LIVE-TESTNET' : 'LIVE') : 'SIM'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
