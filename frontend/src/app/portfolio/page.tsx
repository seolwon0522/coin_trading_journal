'use client';

import { usePortfolioBalance, useRefreshPortfolio, useSyncPortfolio, useRefreshInterval, REFRESH_INTERVALS } from '@/hooks/use-portfolio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, Wallet, Bitcoin, Database, Loader2, Timer, Pause, Play } from 'lucide-react';
import { formatPrice, formatNumber } from '@/lib/utils/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';

export default function PortfolioPage() {
  const { interval, changeInterval } = useRefreshInterval();
  const { data: portfolio, isLoading, error, isAutoRefreshing, toggleAutoRefresh } = usePortfolioBalance(interval);
  const refreshMutation = useRefreshPortfolio();
  const syncMutation = useSyncPortfolio();
  
  // 마지막 업데이트 시간 실시간 표시
  const [lastUpdateText, setLastUpdateText] = useState<string>('');
  
  useEffect(() => {
    if (!portfolio?.timestamp) return;
    
    const updateTimeText = () => {
      const now = new Date();
      const updateTime = new Date(portfolio.timestamp);
      const diffSeconds = Math.floor((now.getTime() - updateTime.getTime()) / 1000);
      
      if (diffSeconds < 5) {
        setLastUpdateText('방금 전');
      } else if (diffSeconds < 60) {
        setLastUpdateText(`${diffSeconds}초 전`);
      } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        setLastUpdateText(`${minutes}분 전`);
      } else {
        setLastUpdateText(updateTime.toLocaleTimeString('ko-KR'));
      }
    };
    
    updateTimeText();
    const timer = setInterval(updateTimeText, 1000);
    
    return () => clearInterval(timer);
  }, [portfolio?.timestamp]);

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleIntervalChange = (value: string) => {
    const intervalValue = value === 'OFF' ? false : Number(value);
    changeInterval(intervalValue as any);
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              포트폴리오를 불러올 수 없습니다. API 키를 확인해주세요.
            </p>
            <Button 
              onClick={handleSync} 
              className="mt-4"
              variant="outline"
            >
              <Database className="h-4 w-4 mr-2" />
              DB 동기화 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">내 포트폴리오</h1>
          <p className="text-muted-foreground">Binance 계정의 실시간 자산 현황</p>
          {portfolio?.timestamp && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                업데이트: {lastUpdateText}
              </span>
              {isAutoRefreshing && interval && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                  자동 갱신 중
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {/* 실시간 업데이트 간격 선택 */}
          <Select 
            value={interval === false ? 'OFF' : String(interval)}
            onValueChange={handleIntervalChange}
          >
            <SelectTrigger className="w-32">
              <Timer className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OFF">수동</SelectItem>
              <SelectItem value={String(REFRESH_INTERVALS.SLOW)}>30초</SelectItem>
              <SelectItem value={String(REFRESH_INTERVALS.NORMAL)}>10초</SelectItem>
              <SelectItem value={String(REFRESH_INTERVALS.FAST)}>5초</SelectItem>
              <SelectItem value={String(REFRESH_INTERVALS.REALTIME)}>3초</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 자동 새로고침 토글 */}
          <Button
            onClick={toggleAutoRefresh}
            size="sm"
            variant="outline"
            disabled={interval === false}
          >
            {isAutoRefreshing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          {/* 수동 새로고침 */}
          <Button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          
          {/* DB 동기화 */}
          <Button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            size="sm"
          >
            {syncMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                동기화 중...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                DB 동기화
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 총 자산 카드 - 실시간 업데이트 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 자산 (USDT)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <div className="text-2xl font-bold">
                  ${formatNumber(portfolio?.totalValueUsdt || 0)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600">LIVE</span>
                  {isAutoRefreshing && (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse delay-75" />
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse delay-150" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 자산 (BTC)</CardTitle>
            <Bitcoin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <div className="text-2xl font-bold">
                  ₿{formatNumber(portfolio?.totalValueBtc || 0, 8)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600">LIVE</span>
                  {isAutoRefreshing && (
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse delay-75" />
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse delay-150" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">보유 코인</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div>
                <div className="text-2xl font-bold">
                  {portfolio?.balances.length || 0}개
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {syncMutation.data ? '동기화됨' : '실시간'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 자산 목록 테이블 - 실시간 현재가 및 평가금액 */}
      <Card>
        <CardHeader>
          <CardTitle>자산 상세</CardTitle>
          <div className="text-sm text-muted-foreground flex items-center justify-between">
            <span>
              마지막 업데이트: {lastUpdateText}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 font-semibold">
                LIVE • 실시간 데이터
              </span>
              {isAutoRefreshing && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  {interval && `${interval / 1000}초마다 갱신`}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !portfolio ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : portfolio?.balances && portfolio.balances.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">코인</th>
                    <th className="text-right py-3 px-2">보유 수량</th>
                    <th className="text-right py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        현재가 (USDT)
                        {isAutoRefreshing && (
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </th>
                    <th className="text-right py-3 px-2">
                      <div className="flex items-center justify-end gap-1">
                        평가 금액
                        {isAutoRefreshing && (
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </th>
                    <th className="text-right py-3 px-2">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.balances.map((balance) => (
                    <tr key={balance.asset} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-medium">{balance.asset}</div>
                        {balance.locked > 0 && (
                          <div className="text-xs text-muted-foreground">
                            잠김: {formatNumber(balance.locked)}
                          </div>
                        )}
                      </td>
                      <td className="text-right py-3 px-2">
                        {formatNumber(balance.total, 8)}
                      </td>
                      <td className="text-right py-3 px-2">
                        <div className="transition-all duration-300">
                          ${formatPrice(balance.priceUsdt)}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        <div className="transition-all duration-300">
                          ${formatNumber(balance.valueUsdt)}
                        </div>
                      </td>
                      <td className="text-right py-3 px-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(balance.allocation, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {balance.allocation.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={3} className="py-3 px-2 font-semibold">
                      합계
                    </td>
                    <td className="text-right py-3 px-2 font-bold">
                      ${formatNumber(portfolio.totalValueUsdt)}
                    </td>
                    <td className="text-right py-3 px-2 font-semibold">
                      100.0%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>보유 중인 자산이 없습니다</p>
              <Button 
                onClick={handleSync} 
                className="mt-4"
                variant="outline"
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    DB 동기화
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}