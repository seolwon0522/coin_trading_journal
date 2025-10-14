'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  CheckCircle2,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Clock,
  Database,
  PlayCircle,
  XCircle
} from 'lucide-react';
export interface BacktestProgress {
  type: 'backtest_progress';
  stage: string;
  progress: number;
  message: string;
  long_trades?: number;
  short_trades?: number;
  total_trades?: number;
  win_rate?: number;
  total_bars?: number;
  strategy_type?: string;
  symbol?: string;
  timestamp?: string;
}

interface BacktestLogEntry {
  id: string;
  timestamp: string;
  stage: string;
  message: string;
  progress: number;
  level: 'info' | 'success' | 'warning' | 'error';
  data?: {
    long_trades?: number;
    short_trades?: number;
    total_trades?: number;
    win_rate?: number;
    total_bars?: number;
  };
}

interface BacktestLogViewerProps {
  enabled?: boolean;
}

export function BacktestLogViewer({ enabled = false }: BacktestLogViewerProps) {
  const [logs, setLogs] = useState<BacktestLogEntry[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // WebSocket 기능 비활성화 (auto-trading 페이지에서는 불필요)
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<BacktestProgress | null>(null);

  const addLog = (entry: Omit<BacktestLogEntry, 'id' | 'timestamp'>) => {
    const newLog: BacktestLogEntry = {
      ...entry,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleBacktestProgress = (progress: BacktestProgress) => {
    const { stage, progress: percent, message, long_trades, short_trades, total_trades, win_rate, total_bars } = progress;

    setCurrentProgress(percent);
    setCurrentStage(stage);

    // Determine log level based on stage
    let level: BacktestLogEntry['level'] = 'info';
    if (stage === 'completed') {
      level = 'success';
      setIsRunning(false);
    } else if (stage === 'error') {
      level = 'error';
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }

    addLog({
      stage,
      message,
      progress: percent,
      level,
      data: {
        long_trades,
        short_trades,
        total_trades,
        win_rate,
        total_bars
      }
    });
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'initialization':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'downloading_data':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'data_processing':
        return <Activity className="h-4 w-4 text-orange-500" />;
      case 'data_loaded':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'processing_results':
        return <BarChart3 className="h-4 w-4 text-indigo-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadgeVariant = (level: BacktestLogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR');
  };

  const getStageDisplayName = (stage: string): string => {
    const stageNames: Record<string, string> = {
      'connection': '연결',
      'initialization': '초기화',
      'downloading_data': '데이터 다운로드',
      'data_processing': '데이터 처리',
      'data_loaded': '데이터 로드 완료',
      'running': '백테스트 실행',
      'processing_results': '결과 처리',
      'completed': '완료',
      'error': '오류'
    };
    return stageNames[stage] || stage;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              백테스트 실시간 로그
            </CardTitle>
            <CardDescription>
              {isConnected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  연결됨
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500">
                  <AlertCircle className="h-3 w-3" />
                  연결 대기중
                </span>
              )}
            </CardDescription>
          </div>

          {isRunning && (
            <Badge variant="default" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              실행중
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{getStageDisplayName(currentStage)}</span>
              <span className="text-muted-foreground">{currentProgress}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>
        )}

        {/* Current Stats */}
        {lastMessage?.type === 'backtest_progress' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            {lastMessage.long_trades !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>롱 거래</span>
                </div>
                <p className="text-lg font-bold text-green-600">{lastMessage.long_trades}</p>
              </div>
            )}
            {lastMessage.short_trades !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3" />
                  <span>숏 거래</span>
                </div>
                <p className="text-lg font-bold text-red-600">{lastMessage.short_trades}</p>
              </div>
            )}
            {lastMessage.total_trades !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart3 className="h-3 w-3" />
                  <span>총 거래</span>
                </div>
                <p className="text-lg font-bold">{lastMessage.total_trades}</p>
              </div>
            )}
            {lastMessage.win_rate !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span>승률</span>
                </div>
                <p className="text-lg font-bold">{lastMessage.win_rate.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}

        {/* Log Entries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">로그 메시지</h4>
            <Badge variant="outline" className="text-xs">
              {logs.length}개 항목
            </Badge>
          </div>

          <ScrollArea className="h-[400px] w-full rounded-md border p-4" ref={scrollRef}>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">백테스트 로그가 표시됩니다</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card hover:bg-accent/50 transition-colors border"
                  >
                    <div className="mt-0.5">
                      {getStageIcon(log.stage)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs">
                          {getStageDisplayName(log.stage)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(log.timestamp)}
                        </span>
                      </div>

                      <p className="text-sm">{log.message}</p>

                      {log.data && Object.keys(log.data).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(log.data).map(([key, value]) => (
                            value !== undefined && (
                              <span key={key} className="text-xs bg-muted px-2 py-1 rounded">
                                {key}: <span className="font-semibold">{value}</span>
                              </span>
                            )
                          ))}
                        </div>
                      )}
                    </div>

                    {log.progress > 0 && (
                      <div className="text-xs font-medium text-muted-foreground">
                        {log.progress}%
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
