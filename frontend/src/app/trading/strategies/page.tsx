'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrategyCard } from '@/components/strategies/StrategyCard';
import { StrategyForm } from '@/components/strategies/StrategyForm';
import { BacktestDialog } from '@/components/strategies/BacktestDialog';
import { StrategyDetailsDialog } from '@/components/strategies/StrategyDetailsDialog';
import { strategyApi, StrategyResponse } from '@/lib/api/strategy-api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function StrategiesPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // 전략 목록 조회
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['strategies', activeTab],
    queryFn: async () => {
      if (activeTab === 'active') {
        return { content: await strategyApi.getActive() };
      }
      return await strategyApi.list(0, 20);
    },
    refetchInterval: 30000, // 30초마다 갱신
  });

  const handleEdit = (strategy: StrategyResponse) => {
    setSelectedStrategy(strategy);
    setIsFormOpen(true);
  };

  const handleBacktest = (strategy: StrategyResponse) => {
    setSelectedStrategy(strategy);
    setIsBacktestOpen(true);
  };

  const handleViewDetails = (strategy: StrategyResponse) => {
    setSelectedStrategy(strategy);
    setIsDetailsOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedStrategy(null);
    setIsFormOpen(true);
  };

  const strategies = data?.content || [];
  const activeStrategies = strategies.filter(s => s.active);
  const inactiveStrategies = strategies.filter(s => !s.active);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">자동매매 전략</h1>
          <p className="text-muted-foreground mt-2">
            AI 기반 자동매매 전략을 관리하고 실행합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            새 전략 만들기
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">전체 전략</p>
          <p className="text-2xl font-bold">{strategies.length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">실행중</p>
          <p className="text-2xl font-bold text-green-600">
            {activeStrategies.length}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">평균 수익률</p>
          <p className="text-2xl font-bold">
            {strategies.length > 0
              ? `${(
                  strategies.reduce((acc, s) => acc + (s.totalReturn || 0), 0) /
                  strategies.length
                ).toFixed(2)}%`
              : '-'}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">총 거래수</p>
          <p className="text-2xl font-bold">
            {strategies.reduce((acc, s) => acc + (s.totalTrades || 0), 0)}
          </p>
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            전체 ({strategies.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            실행중 ({activeStrategies.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            대기중 ({inactiveStrategies.length})
          </TabsTrigger>
        </TabsList>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">
              전략을 불러오는데 실패했습니다
            </p>
            <Button onClick={() => refetch()}>다시 시도</Button>
          </div>
        )}

        {/* 전략 목록 */}
        {!isLoading && !error && (
          <>
            <TabsContent value="all">
              {strategies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    아직 생성된 전략이 없습니다
                  </p>
                  <Button onClick={handleCreateNew}>
                    첫 전략 만들기
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {strategies.map((strategy) => (
                    <StrategyCard
                      key={strategy.id}
                      strategy={strategy}
                      onEdit={handleEdit}
                      onBacktest={handleBacktest}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active">
              {activeStrategies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    실행중인 전략이 없습니다
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeStrategies.map((strategy) => (
                    <StrategyCard
                      key={strategy.id}
                      strategy={strategy}
                      onEdit={handleEdit}
                      onBacktest={handleBacktest}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="inactive">
              {inactiveStrategies.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    대기중인 전략이 없습니다
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveStrategies.map((strategy) => (
                    <StrategyCard
                      key={strategy.id}
                      strategy={strategy}
                      onEdit={handleEdit}
                      onBacktest={handleBacktest}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* 전략 생성/수정 다이얼로그 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStrategy ? '전략 수정' : '새 전략 만들기'}
            </DialogTitle>
            <DialogDescription>
              자동매매 전략을 설정하고 파라미터를 조정합니다
            </DialogDescription>
          </DialogHeader>
          <StrategyForm
            strategy={selectedStrategy}
            onSuccess={() => {
              setIsFormOpen(false);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 백테스트 다이얼로그 */}
      {selectedStrategy && (
        <BacktestDialog
          open={isBacktestOpen}
          onOpenChange={setIsBacktestOpen}
          strategy={selectedStrategy}
        />
      )}

      {/* 상세보기 다이얼로그 */}
      {selectedStrategy && (
        <StrategyDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          strategy={selectedStrategy}
        />
      )}
    </div>
  );
}