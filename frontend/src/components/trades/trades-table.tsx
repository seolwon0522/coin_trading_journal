'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Edit, Trash2, Plus, RefreshCw, AlertCircle, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTrades } from '@/hooks/use-trades';
import { Trade } from '@/lib/api/trades-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TradeFormSimple } from '@/components/trades/trade-form-simple';

// 가격 포맷팅
function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}

// 매매전략 라벨
function getTradingStrategyLabel(strategy?: string): string {
  switch (strategy) {
    case 'BREAKOUT': return '돌파매매';
    case 'TREND': return '추세매매';
    case 'COUNTER_TREND': return '역추세매매';
    case 'SCALPING': return '스캘핑';
    case 'SWING': return '스윙';
    case 'POSITION': return '포지션';
    default: return '일반';
  }
}

interface TradesTableProps {
  selectedMonth?: Date;
}

export function TradesTable({ selectedMonth }: TradesTableProps = {}) {
  const { 
    trades, 
    loading, 
    error, 
    deleteTrade, 
    refresh,
    page,
    totalPages,
    totalElements,
    changePage 
  } = useTrades();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await deleteTrade(id);
      toast.success('거래가 삭제되었습니다');
    } catch (error) {
      toast.error('삭제 실패');
    }
  };

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setEditingTrade(null);
    setIsFormOpen(false);
    refresh();
  };

  // 스켈레톤 로딩 UI
  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-12 w-20" />
                <Skeleton className="h-12 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 개선된 에러 상태 UI
  if (error) {
    return (
      <div className="w-full">
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="flex items-center justify-between">
              <span>거래 내역을 불러올 수 없습니다.</span>
              <Button 
                onClick={refresh} 
                variant="outline" 
                size="sm" 
                className="ml-4 gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                다시 시도
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold">거래 내역</h2>
          <div className="flex gap-2">
            <Button 
              onClick={refresh} 
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              새로고침
            </Button>
            <Button onClick={() => setIsFormOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              새 거래
            </Button>
          </div>
        </div>

        {!trades || trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-gradient-to-b from-muted/30 to-muted/10 rounded-xl border border-dashed">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Coins className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">아직 거래 내역이 없어요</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              첫 거래를 기록하고 수익률을 추적해보세요. 
              체계적인 기록이 성공적인 트레이딩의 시작입니다!
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                첫 거래 기록하기
              </Button>
              <Button onClick={refresh} variant="outline" className="gap-2">
                <RefreshCw className="h-3 w-3" />
                새로고침
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[100px]">심볼</TableHead>
                      <TableHead className="min-w-[80px]">타입</TableHead>
                      <TableHead className="min-w-[80px]">방향</TableHead>
                      <TableHead className="text-right min-w-[100px]">수량</TableHead>
                      <TableHead className="text-right min-w-[100px]">가격</TableHead>
                      <TableHead className="text-right min-w-[120px]">총액</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">전략</TableHead>
                      <TableHead className="min-w-[140px]">체결시간</TableHead>
                      <TableHead className="text-center min-w-[100px]">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {trade.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${
                            trade.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {trade.side === 'BUY' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium hidden sm:inline">
                              {trade.side === 'BUY' ? '매수' : '매도'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatPrice(trade.quantity)}</TableCell>
                        <TableCell className="text-right">${formatPrice(trade.price)}</TableCell>
                        <TableCell className="text-right">
                          ${formatPrice(trade.quantity * trade.price)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary" className="text-xs">
                            {getTradingStrategyLabel(trade.tradingStrategy)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(trade.executedAt), 'MM-dd HH:mm')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(trade)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => trade.id && handleDelete(trade.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* 페이지네이션 */}
        {trades && trades.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
            <div className="text-sm text-muted-foreground">
              전체 {totalElements}개 중 {(page * 20) + 1}-{Math.min((page + 1) * 20, totalElements)}개 표시
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(page - 1)}
                disabled={page === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = page > 2 ? page - 2 + i : i;
                  if (pageNum >= totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => changePage(pageNum)}
                      className="w-9 h-9 p-0"
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(page + 1)}
                disabled={page === totalPages - 1}
                className="gap-1"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTrade ? '거래 수정' : '새 거래 등록'}
            </DialogTitle>
          </DialogHeader>
          <TradeFormSimple 
            trade={editingTrade || undefined} 
            onClose={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}