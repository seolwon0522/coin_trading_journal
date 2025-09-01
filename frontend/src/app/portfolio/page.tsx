'use client';

import { usePortfolioBalance, useRefreshPortfolio } from '@/hooks/use-portfolio';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, Wallet, Bitcoin } from 'lucide-react';
import { formatPrice, formatNumber } from '@/lib/utils/format';

export default function PortfolioPage() {
  const { data: portfolio, isLoading, error } = usePortfolioBalance();
  const refreshMutation = useRefreshPortfolio();

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              포트폴리오를 불러올 수 없습니다. API 키를 확인해주세요.
            </p>
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
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 총 자산 카드 */}
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
              <div className="text-2xl font-bold">
                ${formatNumber(portfolio?.totalValueUsdt || 0)}
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
              <div className="text-2xl font-bold">
                ₿{formatNumber(portfolio?.totalValueBtc || 0, 8)}
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
              <div className="text-2xl font-bold">
                {portfolio?.balances.length || 0}개
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 자산 목록 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>자산 상세</CardTitle>
          <CardDescription>
            {portfolio?.timestamp && 
              `마지막 업데이트: ${new Date(portfolio.timestamp).toLocaleString('ko-KR')}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                    <th className="text-right py-3 px-2">현재가 (USDT)</th>
                    <th className="text-right py-3 px-2">평가 금액</th>
                    <th className="text-right py-3 px-2">비중</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.balances.map((balance) => (
                    <tr key={balance.asset} className="border-b hover:bg-muted/50">
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
                        ${formatPrice(balance.priceUsdt)}
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        ${formatNumber(balance.valueUsdt)}
                      </td>
                      <td className="text-right py-3 px-2">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full"
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
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              보유 중인 자산이 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}