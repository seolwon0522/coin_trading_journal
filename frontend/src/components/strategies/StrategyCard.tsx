'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  StrategyResponse,
  strategyApi,
  getStrategyTypeLabel,
  getStrategyStatusText,
  getStrategyStatusColor
} from '@/lib/api/strategy-api';
import { TrendingUp, TrendingDown, Activity, Settings, Play, Pause, ChartBar } from 'lucide-react';

interface StrategyCardProps {
  strategy: StrategyResponse;
  onEdit?: (strategy: StrategyResponse) => void;
  onBacktest?: (strategy: StrategyResponse) => void;
  onViewDetails?: (strategy: StrategyResponse) => void;
}

export function StrategyCard({ strategy, onEdit, onBacktest, onViewDetails }: StrategyCardProps) {
  const [isToggling, setIsToggling] = useState(false);
  const queryClient = useQueryClient();

  // 활성화/비활성화 mutation
  const toggleMutation = useMutation({
    mutationFn: async (active: boolean) => {
      if (active) {
        return strategyApi.activate(strategy.id);
      } else {
        return strategyApi.deactivate(strategy.id);
      }
    },
    onMutate: () => {
      setIsToggling(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast.success(
        strategy.active
          ? '전략이 비활성화되었습니다'
          : '전략이 활성화되었습니다'
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || '전략 상태 변경에 실패했습니다'
      );
    },
    onSettled: () => {
      setIsToggling(false);
    }
  });

  // 동기화 mutation
  const syncMutation = useMutation({
    mutationFn: () => strategyApi.sync(strategy.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      toast.success('전략 상태가 동기화되었습니다');
    },
    onError: () => {
      toast.error('동기화에 실패했습니다');
    }
  });

  const handleToggle = () => {
    toggleMutation.mutate(!strategy.active);
  };

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return value.toFixed(2);
  };

  const formatPnL = (value?: number) => {
    if (value === undefined || value === null) return '-';
    const formatted = value.toFixed(2);
    const color = value >= 0 ? 'text-green-600' : 'text-red-600';
    const icon = value >= 0 ? <TrendingUp className="h-4 w-4 inline" /> : <TrendingDown className="h-4 w-4 inline" />;
    return (
      <span className={color}>
        {icon} ${formatted}
      </span>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{strategy.name}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {getStrategyTypeLabel(strategy.type)}
              </Badge>
              <Badge variant="outline">{strategy.symbol}</Badge>
              {strategy.testnet && (
                <Badge variant="secondary" className="text-xs">
                  테스트넷
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${getStrategyStatusColor(strategy.active)}`}>
              {getStrategyStatusText(strategy.active, strategy.deactivatedAt)}
            </span>
            <Switch
              checked={strategy.active}
              onCheckedChange={handleToggle}
              disabled={isToggling}
              aria-label="전략 활성화/비활성화"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">승률</p>
            <p className="text-lg font-semibold">
              {strategy.winRate ? `${formatNumber(strategy.winRate)}%` : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">총 수익률</p>
            <p className="text-lg font-semibold">
              {strategy.totalReturn ? (
                <span className={strategy.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {strategy.totalReturn >= 0 ? '+' : ''}{formatNumber(strategy.totalReturn)}%
                </span>
              ) : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">총 거래수</p>
            <p className="text-lg font-semibold">
              {strategy.totalTrades || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">실현 손익</p>
            <p className="text-lg font-semibold">
              {formatPnL(strategy.realizedPnl)}
            </p>
          </div>
        </div>

        {strategy.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {strategy.description}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit?.(strategy)}
            disabled={strategy.active}
          >
            <Settings className="h-4 w-4 mr-1" />
            설정
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBacktest?.(strategy)}
          >
            <ChartBar className="h-4 w-4 mr-1" />
            백테스트
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails?.(strategy)}
          >
            <Activity className="h-4 w-4 mr-1" />
            상세보기
          </Button>
          {strategy.active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => syncMutation.mutate()}
            >
              동기화
            </Button>
          )}
        </div>

        {strategy.lastTradeAt && (
          <p className="text-xs text-muted-foreground mt-4">
            마지막 거래: {new Date(strategy.lastTradeAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}