'use client';

import { useState } from 'react';
import { Plus, BarChart3, TrendingUp, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { TradeForm } from '@/components/trades/trade-form';
import { TradesTable } from '@/components/trades/trades-table';
import { Calendar as CalendarIcon } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function TradesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const router = useRouter();

  const handleFormSuccess = () => {
    setShowForm(false);
  };

  const handlePreviousMonth = () => {
    setSelectedMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => addMonths(prev, 1));
  };

  const handleGoToStatistics = () => {
    router.push('/statistics');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedMonth(date);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* 페이지 헤더 */}
      <div className="border-b bg-muted/50">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-8 w-8" />
                매매 기록
              </h1>
              <p className="text-muted-foreground mt-2">
                거래 내역을 체계적으로 기록하고 관리하세요.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleGoToStatistics} className="gap-2">
                <BarChart3 className="h-4 w-4" />
                통계 보기
              </Button>
              <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
                <Plus className="h-4 w-4" />
                {showForm ? '폼 닫기' : '새 기록 추가'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-6 space-y-6">
        {/* 월별 네비게이션 */}
        <div className="flex items-center justify-between bg-card border rounded-lg p-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth} className="gap-2">
              <ChevronLeft className="h-4 w-4" />
              이전달
            </Button>
            <div className="text-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="h-auto p-2 hover:bg-muted/50">
                    <div className="text-center">
                      <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                        {format(selectedMonth, 'yyyy년 M월', { locale: ko })}
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {format(selectedMonth, 'yyyy년 M월', { locale: ko })} 거래 내역
                      </p>
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarIcon
                    mode="single"
                    selected={selectedMonth}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="rounded-md border"
                    locale={ko}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="gap-2">
              다음달
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedMonth(new Date())}>
              이번달
            </Button>
          </div>
        </div>

        {/* 입력 폼 (조건부 렌더링) */}
        {showForm && <TradeForm onSuccess={handleFormSuccess} />}

        {/* 거래 테이블 */}
        <TradesTable selectedMonth={selectedMonth} />

        {/* 도움말 섹션 */}
        {!showForm && (
          <div className="mt-8 p-6 bg-muted/30 rounded-lg border border-dashed">
            <h3 className="text-lg font-semibold mb-2">💡 매매 기록 관리 팁</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1">📝 상세한 기록</h4>
                <p>진입/청산 이유, 시장 상황, 감정 상태 등을 메모에 기록하세요.</p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">⏰ 정확한 시간</h4>
                <p>정확한 거래 시간을 기록하여 시장 타이밍을 분석하세요.</p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">💰 손익 추적</h4>
                <p>청산가를 입력하면 자동으로 손익이 계산됩니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
