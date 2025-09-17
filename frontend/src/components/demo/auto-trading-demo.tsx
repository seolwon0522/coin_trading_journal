'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Settings,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Lock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotStatus {
  name: string;
  status: 'active' | 'paused' | 'stopped';
  profit: number;
  trades: number;
  winRate: number;
  strategy: string;
}

export function AutoTradingDemo() {
  const [isRunning, setIsRunning] = useState(true);
  const [bots, setBots] = useState<BotStatus[]>([
    {
      name: 'Grid Trading Bot',
      status: 'active',
      profit: 127.5,
      trades: 45,
      winRate: 68,
      strategy: 'Grid',
    },
    {
      name: 'DCA Bot',
      status: 'active',
      profit: 89.2,
      trades: 23,
      winRate: 78,
      strategy: 'DCA',
    },
    {
      name: 'Scalping Bot',
      status: 'paused',
      profit: -15.3,
      trades: 156,
      winRate: 52,
      strategy: 'Scalp',
    },
  ]);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalProfit: 201.4,
    activeStrategies: 2,
    totalTrades: 224,
    avgWinRate: 66,
  });

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // 봇 상태 업데이트
      setBots(prev => prev.map(bot => {
        if (bot.status !== 'active') return bot;

        const profitChange = (Math.random() - 0.5) * 10;
        const newTrade = Math.random() > 0.7;

        return {
          ...bot,
          profit: bot.profit + profitChange,
          trades: newTrade ? bot.trades + 1 : bot.trades,
          winRate: Math.min(100, Math.max(0, bot.winRate + (Math.random() - 0.5) * 2)),
        };
      }));

      // 새 주문 추가
      if (Math.random() > 0.5) {
        const newOrder = {
          id: Math.random().toString(36).substr(2, 9),
          bot: ['Grid Bot', 'DCA Bot', 'Scalp Bot'][Math.floor(Math.random() * 3)],
          type: Math.random() > 0.5 ? 'BUY' : 'SELL',
          symbol: ['BTC', 'ETH', 'BNB'][Math.floor(Math.random() * 3)],
          price: (Math.random() * 10000 + 1000).toFixed(2),
          status: Math.random() > 0.2 ? 'success' : 'failed',
          time: new Date().toLocaleTimeString(),
        };

        setRecentOrders(prev => [newOrder, ...prev.slice(0, 4)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const toggleBot = (index: number) => {
    setBots(prev => prev.map((bot, i) => {
      if (i === index) {
        return {
          ...bot,
          status: bot.status === 'active' ? 'paused' : 'active',
        };
      }
      return bot;
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          자동매매 봇
        </h3>
        <Button
          size="sm"
          variant={isRunning ? "secondary" : "default"}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4 mr-1" /> 전체 정지
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" /> 전체 시작
            </>
          )}
        </Button>
      </div>

      {/* 전체 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <Badge
              variant={totalStats.totalProfit > 0 ? "default" : "secondary"}
              className="text-xs"
            >
              {totalStats.totalProfit > 0 ? '+' : ''}{totalStats.totalProfit.toFixed(1)}%
            </Badge>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">
              ${Math.abs(totalStats.totalProfit * 100).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">총 수익</p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              {totalStats.activeStrategies}/3
            </Badge>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{totalStats.activeStrategies}</p>
            <p className="text-xs text-muted-foreground">활성 봇</p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">24h</span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{totalStats.totalTrades}</p>
            <p className="text-xs text-muted-foreground">총 거래</p>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <Badge className="text-xs">{totalStats.avgWinRate}%</Badge>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{totalStats.avgWinRate}%</p>
            <p className="text-xs text-muted-foreground">승률</p>
          </div>
        </Card>
      </div>

      {/* 봇 상태 */}
      <div className="space-y-3">
        {bots.map((bot, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  bot.status === 'active' ? "bg-green-500/10" : "bg-muted"
                )}>
                  <Bot className={cn(
                    "h-4 w-4",
                    bot.status === 'active' ? "text-green-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <h4 className="font-medium">{bot.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    전략: {bot.strategy}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={bot.status === 'active' ? "secondary" : "default"}
                  onClick={() => toggleBot(index)}
                >
                  {bot.status === 'active' ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">수익률</p>
                <p className={cn(
                  "font-medium",
                  bot.profit > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {bot.profit > 0 ? '+' : ''}{bot.profit.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">거래 횟수</p>
                <p className="font-medium">{bot.trades}</p>
              </div>
              <div>
                <p className="text-muted-foreground">승률</p>
                <p className="font-medium">{bot.winRate}%</p>
              </div>
            </div>

            <div className="mt-3">
              <Progress value={bot.winRate} className="h-1" />
            </div>
          </Card>
        ))}
      </div>

      {/* 최근 주문 */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">최근 자동 주문</h4>
        <div className="space-y-2">
          {recentOrders.map(order => (
            <div
              key={order.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {order.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{order.symbol}/USDT</span>
                    <Badge
                      variant={order.type === 'BUY' ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {order.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.bot} • {order.time}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">${order.price}</p>
                <p className="text-xs text-muted-foreground">
                  {order.status === 'success' ? '체결됨' : '실패'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}