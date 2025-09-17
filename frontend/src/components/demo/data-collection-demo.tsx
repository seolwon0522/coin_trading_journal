'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Globe,
  Database,
  Timer,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { generateTrade } from '@/lib/demo/data-generators';
import { cn } from '@/lib/utils';

export function DataCollectionDemo() {
  const [isRunning, setIsRunning] = useState(true);
  const [trades, setTrades] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVolume: 0,
    avgLatency: 48,
    activeConnections: 5,
    dataPoints: 0,
  });

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // 새 거래 추가
      setTrades(prev => {
        const newTrade = generateTrade();
        return [newTrade, ...prev.slice(0, 4)];
      });

      // 통계 업데이트
      setStats(prev => ({
        ...prev,
        totalVolume: prev.totalVolume + Math.random() * 1000,
        avgLatency: Math.floor(Math.random() * 20 + 40),
        dataPoints: prev.dataPoints + 1,
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5" />
          실시간 데이터 수집
        </h3>
        <Button
          size="sm"
          variant={isRunning ? "secondary" : "default"}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4 mr-1" /> 일시정지
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" /> 시작
            </>
          )}
        </Button>
      </div>

      {/* 실시간 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">실시간</Badge>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">
              {stats.dataPoints.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">데이터 포인트</p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-green-500">{stats.activeConnections}</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{stats.activeConnections}</p>
            <p className="text-xs text-muted-foreground">거래소 연결</p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <Badge
              variant={stats.avgLatency < 50 ? "default" : "secondary"}
              className="text-xs"
            >
              {stats.avgLatency}ms
            </Badge>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{stats.avgLatency}ms</p>
            <p className="text-xs text-muted-foreground">평균 지연</p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">24h</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">
              ${(stats.totalVolume / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-muted-foreground">거래량</p>
          </div>
        </Card>
      </div>

      {/* 최근 거래 */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">최근 거래</h4>
        <div className="space-y-2">
          {trades.map((trade, index) => (
            <div
              key={trade.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-all",
                "bg-muted/50",
                index === 0 && "animate-pulse-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-1.5 rounded",
                  trade.type === 'BUY' ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  {trade.type === 'BUY' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trade.symbol}/USDT</span>
                    <Badge
                      variant={trade.type === 'BUY' ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {trade.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{trade.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">${trade.price}</p>
                <p className="text-xs text-muted-foreground">
                  {trade.amount} {trade.symbol}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}