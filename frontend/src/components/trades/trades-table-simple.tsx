'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import { useTrades } from '@/hooks/use-trades';
import { Trade } from '@/lib/api/trades-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function TradesTableSimple() {
  const { trades, loading, error, deleteTrade, refresh } = useTrades();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await deleteTrade(id);
      toast.success('거래가 삭제되었습니다');
    } catch (error) {
      toast.error('삭제 실패');
    }
  };

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">에러: {error}</div>;
  }

  if (!trades || trades.length === 0) {
    return <div className="text-center py-8">거래 내역이 없습니다</div>;
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">심볼</th>
            <th className="text-left p-2">타입</th>
            <th className="text-left p-2">방향</th>
            <th className="text-right p-2">수량</th>
            <th className="text-right p-2">가격</th>
            <th className="text-right p-2">총액</th>
            <th className="text-center p-2">체결시간</th>
            <th className="text-center p-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="border-b hover:bg-gray-50">
              <td className="p-2 font-medium">{trade.symbol}</td>
              <td className="p-2">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                  {trade.type}
                </span>
              </td>
              <td className="p-2">
                <span className={`flex items-center gap-1 ${
                  trade.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trade.side === 'BUY' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {trade.side}
                </span>
              </td>
              <td className="text-right p-2">{trade.quantity}</td>
              <td className="text-right p-2">${trade.price}</td>
              <td className="text-right p-2">
                ${(trade.quantity * trade.price).toFixed(2)}
              </td>
              <td className="text-center p-2 text-sm">
                {format(new Date(trade.executedAt), 'yyyy-MM-dd HH:mm')}
              </td>
              <td className="text-center p-2">
                <div className="flex gap-1 justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTrade(trade)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => trade.id && handleDelete(trade.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}