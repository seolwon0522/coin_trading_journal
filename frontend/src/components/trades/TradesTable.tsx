'use client';

import React, { useState } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TradeForm } from './TradeForm';
import { useTrades } from '@/hooks/use-trades';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Edit, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface TradesTableProps {
  currency: 'USD' | 'KRW';
}

export function TradesTable({ currency }: TradesTableProps) {
  const { usdToKrw, formatKRW } = useExchangeRate();
  const {
    trades,
    loading,
    error,
    page,
    totalPages,
    totalElements,
    updateTrade,
    deleteTrade,
    changePage,
    refresh,
  } = useTrades();

  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
  };

  const handleUpdate = async (data: any) => {
    if (editingTrade) {
      await updateTrade(editingTrade.id, data);
      setEditingTrade(null);
      refresh();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteTrade(id);
    }
  };

  // 통화 포맷팅 함수
  const formatCurrency = (value: number): string => {
    if (currency === 'USD') {
      return `$${value.toLocaleString()}`;
    } else {
      return formatKRW(usdToKrw(value));
    }
  };

  // 손익 포맷팅 함수
  const formatPnl = (value: number): string => {
    const prefix = value > 0 ? '+' : '';
    if (currency === 'USD') {
      return `${prefix}$${Math.abs(value).toLocaleString()}`;
    } else {
      return `${prefix}${formatKRW(usdToKrw(Math.abs(value)))}`;
    }
  };

  // 로딩 상태
  if (loading && trades.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {error}
      </div>
    );
  }

  // 데이터 없음
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        거래 내역이 없습니다
      </div>
    );
  }

  return (
    <>
      {/* 테이블 */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>심볼</TableHead>
              <TableHead>매수/매도</TableHead>
              <TableHead className="text-right">진입가</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">청산가</TableHead>
              <TableHead className="text-right">
                손익 ({currency})
              </TableHead>
              <TableHead>진입시간</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell className="font-medium">{trade.symbol}</TableCell>
                <TableCell>
                  <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                    {trade.side === 'BUY' ? '매수' : '매도'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(trade.entryPrice)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {trade.entryQuantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {trade.pnl !== null && trade.pnl !== undefined ? (
                    <div className="flex items-center justify-end gap-1">
                      {trade.pnl > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : trade.pnl < 0 ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : null}
                      <div className="flex flex-col items-end">
                        <span className={`font-mono text-sm ${
                          trade.pnl > 0 ? 'text-green-600' : trade.pnl < 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {formatPnl(trade.pnl)}
                        </span>
                        {trade.pnlPercent && (
                          <span className={`text-xs ${
                            trade.pnl > 0 ? 'text-green-500' : trade.pnl < 0 ? 'text-red-500' : 'text-muted-foreground'
                          }`}>
                            ({trade.pnl > 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(trade.entryTime), 'MM-dd HH:mm', { locale: ko })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(trade)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(trade.id)}
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

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            총 {totalElements}개 중 {page * 20 + 1}-{Math.min((page + 1) * 20, totalElements)}개 표시
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <div className="flex items-center px-3 text-sm">
              {page + 1} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingTrade} onOpenChange={(open) => !open && setEditingTrade(null)}>
        <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>거래 수정</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {editingTrade && (
              <TradeForm
                trade={editingTrade}
                onSubmit={handleUpdate}
                onCancel={() => setEditingTrade(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}