/**
 * Nautilus 실시간 모니터링 컴포넌트
 * 
 * Nautilus 엔진의 실시간 상태, 연결 상태, 거래 내역을 표시합니다.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Wallet,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NautilusStatus {
  isRunning: boolean;
  mode: string;
  strategiesCount: number;
  activeStrategies: number;
}

interface PortfolioSummary {
  status: string;
  balances: Record<string, any>;
  positions: any[];
  openOrders: number;
}

interface TradeEvent {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  pnl?: number;
}

import { useNautilusStatus, usePortfolio } from '@/hooks/useNautilus';

export function NautilusMonitor() {
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // React Query 훅 사용 (5초마다 자동 갱신)
  const { data: status, error: statusError, refetch: refetchStatus } = useNautilusStatus(5000);
  const { data: portfolio, refetch: refetchPortfolio } = usePortfolio(true, 5000);

  const error = statusError ? 'Nautilus 서비스에 연결할 수 없습니다. 서비스가 실행 중인지 확인하세요.' : null;

  // WebSocket 연결
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const websocket = new WebSocket('ws://localhost:8001/ws/trading');

        websocket.onopen = () => {
          console.log('[Nautilus WS] Connected');
          setIsConnected(true);
          // 거래 채널 구독
          websocket.send(JSON.stringify({
            type: 'subscribe',
            channels: ['trades', 'orders', 'positions', 'system']
          }));
        };

        websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            setLastUpdate(new Date());

            // 메시지 타입별 처리
            switch (message.type) {
              case 'trade':
                // 새로운 거래 추가
                setRecentTrades((prev) => [message.data, ...prev].slice(0, 20));
                break;
              case 'order':
                // 주문 업데이트
                refetchPortfolio();
                break;
              case 'position':
                // 포지션 업데이트
                refetchPortfolio();
                break;
              case 'status':
                // 상태 업데이트
                refetchStatus(message.data);
                break;
              default:
                console.log('[Nautilus WS] Message:', message);
            }
          } catch (err) {
            console.error('[Nautilus WS] Parse error:', err);
          }
        };

        websocket.onerror = (error) => {
          console.error('[Nautilus WS] Error:', error);
          setIsConnected(false);
        };

        websocket.onclose = () => {
          console.log('[Nautilus WS] Disconnected');
          setIsConnected(false);
          // 5초 후 재연결 시도
          setTimeout(connectWebSocket, 5000);
        };

        setWs(websocket);
      } catch (err) {
        console.error('[Nautilus WS] Connection error:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleRefresh = () => {
    refetchStatus();
    refetchPortfolio();
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nautilus 실시간 모니터</h2>
          <p className="text-sm text-muted-foreground">
            자동매매 엔진의 실시간 상태를 모니터링합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="default" className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              실시간 연결됨
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              연결 끊김
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 상태 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 엔진 상태 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">엔진 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.isRunning ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-600">실행 중</p>
                    <p className="text-xs text-muted-foreground">
                      모드: {status?.mode || 'N/A'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-600">정지됨</p>
                    <p className="text-xs text-muted-foreground">엔진이 실행되지 않음</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 네트워크 상태 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">네트워크</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-600">테스트넷</p>
                <p className="text-xs text-muted-foreground">
                  연습 모드 (실제 거래 아님)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 활성 전략 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">활성 전략</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {status?.activeStrategies || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  총 {status?.strategiesCount || 0}개 전략
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 미결 주문 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">미결 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {portfolio?.openOrders || 0}
                </p>
                <p className="text-xs text-muted-foreground">활성 주문</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 포트폴리오 요약 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              포트폴리오
            </CardTitle>
            <CardDescription>실시간 계좌 잔고 및 포지션</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolio ? (
              <div className="space-y-4">
                {/* 잔고 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">계좌 잔고</h4>
                  {Object.keys(portfolio.balances || {}).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(portfolio.balances).map(([account, balances]: [string, any]) => (
                        <div key={account} className="text-sm">
                          <p className="font-semibold text-xs text-muted-foreground mb-1">
                            {account}
                          </p>
                          {Object.entries(balances).map(([currency, balance]: [string, any]) => (
                            <div key={currency} className="flex justify-between py-1">
                              <span>{currency}</span>
                              <span className="font-mono">
                                {balance.free?.toFixed(8) || '0.00000000'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">잔고 정보 없음</p>
                  )}
                </div>

                {/* 포지션 */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">활성 포지션</h4>
                  {portfolio.positions && portfolio.positions.length > 0 ? (
                    <div className="space-y-2">
                      {portfolio.positions.map((position: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <div>
                            <p className="font-medium">{position.symbol}</p>
                            <p className="text-xs text-muted-foreground">
                              {position.side} {position.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {position.unrealized_pnl >= 0 ? '+' : ''}
                              ${position.unrealized_pnl?.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @ ${position.entry_price?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">열린 포지션 없음</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>포트폴리오 데이터 로딩 중...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 거래 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              최근 거래
            </CardTitle>
            <CardDescription>실시간 체결 내역</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTrades.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between text-sm border-b pb-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {trade.side === 'BUY' ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className="font-medium">{trade.symbol}</span>
                        <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'}>
                          {trade.side}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">{trade.quantity} @ ${trade.price}</p>
                      {trade.pnl !== undefined && (
                        <p
                          className={`text-xs ${
                            trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>거래 내역이 아직 없습니다</p>
                <p className="text-xs mt-2">
                  전략이 실행되면 실시간으로 거래 내역이 표시됩니다
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 마지막 업데이트 시간 */}
      {lastUpdate && (
        <div className="text-center text-xs text-muted-foreground">
          마지막 업데이트: {lastUpdate.toLocaleString()}
        </div>
      )}
    </div>
  );
}

