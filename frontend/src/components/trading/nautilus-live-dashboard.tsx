'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUnifiedWebSocket, useNautilusPositions, useNautilusStrategy } from '@/providers/unified-websocket-provider';
import { useNautilusRealtime } from '@/hooks/use-nautilus-realtime';
import { WifiIcon, WifiOffIcon, ActivityIcon, TrendingUpIcon, ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NautilusLiveDashboardProps {
  strategyId?: string;
  className?: string;
}

export const NautilusLiveDashboard: React.FC<NautilusLiveDashboardProps> = ({
  strategyId,
  className
}) => {
  const { isConnected, getStats } = useUnifiedWebSocket();
  const { positions } = useNautilusPositions(strategyId);
  const { status } = strategyId ? useNautilusStrategy(strategyId) : { status: null };

  // Backend STOMP WebSocket (Redis → Backend → Frontend)
  const {
    isConnected: backendConnected,
    trades: backendTrades,
    positions: backendPositions,
    orders: backendOrders,
  } = useNautilusRealtime();

  const nautilusConnected = isConnected('nautilus');
  const stats = getStats();
  const reconnectAttempts = stats.nautilus.reconnectAttempts;

  // Combine positions from both sources (prefer backend positions if available)
  const allPositions = backendPositions.length > 0 ? backendPositions : positions;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Connection Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Nautilus WebSocket */}
              <div className="flex items-center gap-2">
                {nautilusConnected ? (
                  <>
                    <WifiIcon className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Nautilus</span>
                  </>
                ) : (
                  <>
                    <WifiOffIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">
                      Nautilus {reconnectAttempts > 0 && `(${reconnectAttempts})`}
                    </span>
                  </>
                )}
              </div>

              {/* Backend WebSocket */}
              <div className="flex items-center gap-2">
                {backendConnected ? (
                  <>
                    <WifiIcon className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Backend</span>
                  </>
                ) : (
                  <>
                    <WifiOffIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Backend</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant={(nautilusConnected && backendConnected) ? "default" : "destructive"}>
              {(nautilusConnected && backendConnected) ? "LIVE" : "PARTIAL"}
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
              {allPositions.length > 0 ? (
                <div className="space-y-2">
                  {allPositions.map((position, idx) => {
                    const isBackendPos = 'positionId' in position;
                    return (
                      <div
                        key={isBackendPos ? position.positionId : (position.id || idx)}
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
                            (isBackendPos ? position.unrealizedPnl : position.unrealized_pnl) > 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}>
                            {(isBackendPos
                              ? position.unrealizedPnl?.toFixed(2)
                              : position.unrealized_pnl?.toFixed(2)) || '0.00'}{' '}
                            USDT
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Entry:{' '}
                            {isBackendPos ? position.entryPrice : position.entry_price}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                {backendOrders.length > 0
                  ? `${backendOrders.length}개의 주문 (최근 100개)`
                  : '주문 내역 없음'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backendOrders.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {backendOrders.map((order) => (
                    <div
                      key={order.orderId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.symbol}</span>
                          <Badge
                            variant={
                              order.status === 'FILLED'
                                ? 'default'
                                : order.status === 'CANCELLED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.side} {order.orderType} · {order.quantity}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {order.avgFillPrice > 0
                            ? `${order.avgFillPrice.toFixed(2)} USDT`
                            : order.price
                              ? `${order.price.toFixed(2)} USDT`
                              : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  주문 내역이 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NautilusLiveDashboard;