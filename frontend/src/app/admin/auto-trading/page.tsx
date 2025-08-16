'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Square,
  Pause,
  TrendingUp,
  TrendingDown,
  Activity,
  Bot,
  BarChart3,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// 타입 정의
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
  is_live?: boolean; // 실제 거래 여부
  testnet?: boolean; // 테스트넷 사용 여부
  features: {
    entry_timing_score: number;
    exit_timing_score: number;
    risk_mgmt_score: number;
    pnl_ratio: number;
    volatility: number;
  };
  model_performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    last_trained: string;
  };
}

interface PerformanceData {
  date: string;
  balance: number;
  pnl: number;
  pnl_percentage: number;
  trades_count: number;
  win_rate: number;
}

interface PerformanceSummary {
  total_pnl: number;
  total_pnl_percentage: number;
  max_drawdown: number;
  sharpe_ratio: number;
  total_trades: number;
  avg_win_rate: number;
}

const API_BASE = 'http://localhost:5002/api';

export default function AutoTradingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [bots, setBots] = useState<TradingBot[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('main_bot');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
  const [featureData, setFeatureData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 한글 주석: 관리자 권한 체크
  useEffect(() => {
    if (!user) return;

    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }

    fetchTradingBots();
    fetchPerformanceData(selectedBot);
    fetchFeatureData(selectedBot);

    // 5초마다 데이터 업데이트
    const interval = setInterval(() => {
      fetchTradingBots();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, router, selectedBot]);

  const fetchTradingBots = async () => {
    try {
      const response = await fetch(`${API_BASE}/trading/bots`);
      if (response.ok) {
        const data = await response.json();
        setBots(data);
      }
    } catch (err) {
      console.error('봇 데이터 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPerformanceData = async (botId: string) => {
    try {
      const response = await fetch(`${API_BASE}/trading/performance/${botId}`);
      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data.performance_data);
        setPerformanceSummary(data.summary);
      }
    } catch (err) {
      console.error('성과 데이터 로드 실패:', err);
    }
  };

  const fetchFeatureData = async (botId: string) => {
    try {
      const response = await fetch(`${API_BASE}/trading/features/${botId}`);
      if (response.ok) {
        const data = await response.json();
        setFeatureData(data);
      }
    } catch (err) {
      console.error('피처 데이터 로드 실패:', err);
    }
  };

  const handleBotControl = async (botId: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`${API_BASE}/trading/bots/${botId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        await fetchTradingBots(); // 상태 업데이트
        setError(null);
      } else {
        setError(`봇 ${action} 실패`);
      }
    } catch (err) {
      setError(`봇 제어 중 오류: ${err}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      running: 'default',
      stopped: 'secondary',
      paused: 'secondary',
      error: 'destructive',
    };

    const colors: Record<string, string> = {
      running: '실행중',
      stopped: '정지',
      paused: '일시정지',
      error: '오류',
    };

    return <Badge variant={variants[status] || 'secondary'}>{colors[status] || status}</Badge>;
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
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>자동매매 시스템 로딩중...</p>
        </div>
      </div>
    );
  }

  const currentBot = bots.find((bot) => bot.id === selectedBot);

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">자동매매 관리</h1>
          <p className="text-muted-foreground">관리자: {user.name}</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          자동매매 시스템
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 봇 상태 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <Card
            key={bot.id}
            className={`cursor-pointer transition-all ${
              selectedBot === bot.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedBot(bot.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{bot.name}</CardTitle>
                <div className="flex gap-2">
                  {bot.is_live && (
                    <Badge variant={bot.testnet ? 'outline' : 'default'} className="text-xs">
                      {bot.testnet ? '테스트넷' : '실거래'}
                    </Badge>
                  )}
                  {getStatusBadge(bot.status)}
                </div>
              </div>
              <CardDescription>
                {bot.strategy} • {bot.symbol}
                {bot.is_live && (
                  <span className="ml-2 text-xs text-green-600">• 라이브 트레이딩</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>잔고:</span>
                <strong>${bot.balance.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span>PnL:</span>
                <strong className={bot.current_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {bot.current_pnl >= 0 ? '+' : ''}${bot.current_pnl.toFixed(2)}
                </strong>
              </div>
              <div className="flex justify-between text-sm">
                <span>승률:</span>
                <strong>{(bot.win_rate * 100).toFixed(1)}%</strong>
              </div>

              <div className="flex gap-2 mt-4">
                {bot.status === 'running' ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBotControl(bot.id, 'stop');
                    }}
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
                      handleBotControl(bot.id, 'start');
                    }}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    시작
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 선택된 봇의 상세 정보 */}
      {currentBot && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 성과 차트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                성과 분석
              </CardTitle>
              <CardDescription>{currentBot.name}의 30일 거래 성과</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceSummary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>총 수익:</span>
                      <strong
                        className={
                          performanceSummary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {performanceSummary.total_pnl >= 0 ? '+' : ''}$
                        {performanceSummary.total_pnl.toFixed(2)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>수익률:</span>
                      <strong
                        className={
                          performanceSummary.total_pnl_percentage >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {performanceSummary.total_pnl_percentage >= 0 ? '+' : ''}
                        {performanceSummary.total_pnl_percentage.toFixed(2)}%
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>최대 손실:</span>
                      <strong className="text-red-600">{performanceSummary.max_drawdown}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>샤프 비율:</span>
                      <strong>{performanceSummary.sharpe_ratio}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>총 거래:</span>
                      <strong>{performanceSummary.total_trades}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>평균 승률:</span>
                      <strong>{(performanceSummary.avg_win_rate * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  {/* 간단한 PnL 차트 표시 */}
                  <div className="bg-muted p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2">최근 7일 PnL 추이</h4>
                    <div className="flex items-end gap-1 h-20">
                      {performanceData.slice(-7).map((data, index) => (
                        <div
                          key={index}
                          className={`flex-1 rounded-t ${
                            data.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{
                            height: `${Math.abs(data.pnl_percentage) * 4 + 10}%`,
                          }}
                          title={`${data.date}: ${data.pnl_percentage.toFixed(2)}%`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 피처 분석 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                ML 피처 분석
              </CardTitle>
              <CardDescription>현재 모델의 피처 상태 및 성능</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 현재 피처 점수 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">현재 피처 점수</h4>
                  {Object.entries(currentBot.features).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{key.replace(/_/g, ' ')}</span>
                        <span>{(value * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 모델 성능 지표 */}
                <div className="space-y-3 border-t pt-3">
                  <h4 className="text-sm font-medium">모델 성능</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex justify-between">
                      <span>정확도:</span>
                      <strong>{(currentBot.model_performance.accuracy * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>정밀도:</span>
                      <strong>{(currentBot.model_performance.precision * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>재현율:</span>
                      <strong>{(currentBot.model_performance.recall * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>F1 점수:</span>
                      <strong>{(currentBot.model_performance.f1_score * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    마지막 학습:{' '}
                    {new Date(currentBot.model_performance.last_trained).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
