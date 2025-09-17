'use client';

import { X, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TradingViewChart } from '@/components/tradingview-chart';
import { formatPrice, formatVolume, formatPercent } from '@/lib/format';

interface CoinDetailModalProps {
  symbol: string;
  koreanName: string;
  baseAsset: string;
  tickerData: any; // Ticker24hr 타입
  isLoading: boolean;
  onClose: () => void;
}

export function CoinDetailModal({
  symbol,
  koreanName,
  baseAsset,
  tickerData,
  isLoading,
  onClose,
}: CoinDetailModalProps) {
  // 가격 변화 색상
  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {koreanName}({baseAsset})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ) : tickerData ? (
          <div className="space-y-6">
            {/* 현재 가격 정보 */}
            <div className="text-center">
              <h3 className="text-3xl font-bold">
                ${formatPrice(tickerData.lastPrice)}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={getPriceChangeColor(parseFloat(tickerData.priceChangePercent))}>
                  {formatPercent(tickerData.priceChangePercent)}
                </span>
                <span className="text-sm text-gray-500">
                  (${formatPrice(tickerData.priceChange)})
                </span>
              </div>
            </div>

            {/* 상세 정보 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <DetailItem
                label="24시간 최고가"
                value={`$${formatPrice(tickerData.highPrice)}`}
              />
              <DetailItem
                label="24시간 최저가"
                value={`$${formatPrice(tickerData.lowPrice)}`}
              />
              <DetailItem
                label="시가"
                value={`$${formatPrice(tickerData.openPrice)}`}
              />
              <DetailItem
                label="거래량"
                value={formatVolume(tickerData.volume).replace('$', '')}
              />
              <DetailItem
                label="거래대금"
                value={formatVolume(tickerData.quoteVolume)}
              />
              <DetailItem
                label="거래 횟수"
                value={tickerData.count.toLocaleString()}
              />
              <DetailItem
                label="매수 호가"
                value={`$${formatPrice(tickerData.bidPrice)}`}
              />
              <DetailItem
                label="매도 호가"
                value={`$${formatPrice(tickerData.askPrice)}`}
              />
            </div>

            {/* TradingView 차트 */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">실시간 차트</span>
              </div>
              <div className="w-full h-[600px]">
                <TradingViewChart symbol={symbol} height={600} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-red-600">
            <p>선택된 코인의 정보를 불러올 수 없습니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 상세 정보 아이템 컴포넌트
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-gray-600 text-xs">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}