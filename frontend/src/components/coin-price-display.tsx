'use client';

import { useCoinPrice } from '@/hooks/use-coin-price';
import { Button } from '@/components/ui/button';

// 비트코인 가격 표시 컴포넌트
export function CoinPriceDisplay() {
  const { data: coinData, isLoading, isError, error, refetch } = useCoinPrice();

  if (isLoading) {
    return (
      <div className="p-6 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">비트코인 현재 가격</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 border rounded-lg border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold mb-4 text-red-800">비트코인 현재 가격</h3>
        <p className="text-red-600 mb-4">가격 정보를 불러오는데 실패했습니다: {error?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (!coinData) {
    return null;
  }

  return (
    <div className="p-6 border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">비트코인 현재 가격</h3>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          새로고침
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">USD:</span>
          <span className="font-mono text-lg font-semibold">${coinData.bpi.USD.rate}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">EUR:</span>
          <span className="font-mono text-lg">€{coinData.bpi.EUR.rate}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">GBP:</span>
          <span className="font-mono text-lg">£{coinData.bpi.GBP.rate}</span>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500">마지막 업데이트: {coinData.time.updated}</p>
        </div>
      </div>
    </div>
  );
}
