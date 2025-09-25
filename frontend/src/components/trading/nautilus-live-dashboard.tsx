'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNautilusWebSocket, useNautilusPositions, useNautilusStrategyStatus } from '@/hooks/use-nautilus-websocket';
import { WifiIcon, WifiOffIcon, ActivityIcon, TrendingUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NautilusLiveDashboardProps {
  strategyId?: string;
  className?: string;
}

export const NautilusLiveDashboard: React.FC<NautilusLiveDashboardProps> = ({
  strategyId,
  className
}) => {
  const { isConnected, reconnectAttempts } = useNautilusWebSocket();
  const { positions } = useNautilusPositions(strategyId);
  const { status } = strategyId ? useNautilusStrategyStatus(strategyId) : { status: null };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Connection Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <WifiIcon className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Nautilus 실시간 연결됨</span>
                </>
              ) : (
                <>
                  <WifiOffIcon className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">
                    연결 끊김 {reconnectAttempts > 0 && `(재시도: ${reconnectAttempts})`}
                  </span>
                </>
              )}
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "LIVE" : "OFFLINE"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Live Data Tabs */}
      <Tabs defaultValue="positions" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="positions">포지션</TabsTrigger>
          <TabsTrigger value="performance">성과</TabsTrigger>
          <TabsTrigger value="orders">주문</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActivityIcon className="h-4 w-4" />
                실시간 포지션
              </CardTitle>
              <CardDescription>
                {positions.length > 0
                  ? `${positions.length}개의 활성 포지션`
                  : '활성 포지션 없음'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length > 0 ? (
                <div className="space-y-2">
                  {positions.map((position, idx) => (
                    <div
                      key={position.id || idx}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {position.side} · {position.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-medium",
                          position.unrealized_pnl > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {position.unrealized_pnl?.toFixed(2)} USDT
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Entry: {position.entry_price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  포지션이 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4" />
                실시간 성과
              </CardTitle>
              <CardDescription>
                {status?.is_running ? '전략 실행 중' : '전략 대기 중'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">총 수익</div>
                    <div className={cn(
                      "text-2xl font-bold",
                      status.total_pnl > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {status.total_pnl?.toFixed(2) || '0.00'} USDT
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">승률</div>
                    <div className="text-2xl font-bold">
                      {status.win_rate?.toFixed(1) || '0.0'}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">거래 횟수</div>
                    <div className="text-2xl font-bold">
                      {status.total_trades || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">최대 손실</div>
                    <div className="text-2xl font-bold text-red-600">
                      {status.max_drawdown?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  성과 데이터를 불러오는 중...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>실시간 주문</CardTitle>
              <CardDescription>
                대기 중인 주문과 최근 체결 내역
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                주문 데이터를 구현 예정
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NautilusLiveDashboard;