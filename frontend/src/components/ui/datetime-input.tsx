'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface DateTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

export function DateTimeInput({
  value,
  onChange,
  placeholder = '날짜와 시간 선택',
  className,
  label,
  required = false,
}: DateTimeInputProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [hour, setHour] = React.useState<string>(() => {
    const d = value ? new Date(value) : new Date();
    return String(d.getHours()).padStart(2, '0');
  });
  const [minute, setMinute] = React.useState<string>(() => {
    const d = value ? new Date(value) : new Date();
    // 5분 단위로 반올림
    const mins = Math.round(d.getMinutes() / 5) * 5;
    return String(mins === 60 ? 0 : mins).padStart(2, '0');
  });

  // value prop 변경 시 상태 업데이트
  React.useEffect(() => {
    if (value) {
      const d = new Date(value);
      setDate(d);
      setHour(String(d.getHours()).padStart(2, '0'));
      // 5분 단위로 가장 가까운 값 찾기
      const mins = Math.round(d.getMinutes() / 5) * 5;
      setMinute(String(mins === 60 ? 0 : mins).padStart(2, '0'));
    }
  }, [value]);

  // 날짜 또는 시간 변경 시 onChange 호출
  const updateDateTime = React.useCallback(
    (newDate?: Date, newHour?: string, newMinute?: string) => {
      const dateToUse = newDate || date;
      const hourToUse = newHour !== undefined ? newHour : hour;
      const minuteToUse = newMinute !== undefined ? newMinute : minute;

      if (dateToUse) {
        const updatedDate = new Date(dateToUse);
        updatedDate.setHours(parseInt(hourToUse), parseInt(minuteToUse));
        onChange(updatedDate.toISOString());
      }
    },
    [date, hour, minute, onChange]
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      updateDateTime(selectedDate);
    }
  };

  const handleHourChange = (value: string) => {
    setHour(value);
    updateDateTime(undefined, value, minute);
  };

  const handleMinuteChange = (value: string) => {
    setMinute(value);
    updateDateTime(undefined, hour, value);
  };

  const setCurrentDateTime = () => {
    const now = new Date();
    setDate(now);
    setHour(String(now.getHours()).padStart(2, '0'));
    // 5분 단위로 반올림
    const mins = Math.round(now.getMinutes() / 5) * 5;
    setMinute(String(mins === 60 ? 0 : mins).padStart(2, '0'));
    
    const adjustedDate = new Date(now);
    adjustedDate.setMinutes(mins === 60 ? 0 : mins);
    if (mins === 60) {
      adjustedDate.setHours(adjustedDate.getHours() + 1);
    }
    onChange(adjustedDate.toISOString());
  };

  // 시간 옵션 생성
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 5분 단위

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {label} {required && '*'}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setCurrentDateTime}
            className="h-6 px-2 text-xs"
          >
            <Clock className="h-3 w-3 mr-1" />
            현재 시간
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {/* 날짜 선택 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'flex-1 justify-start text-left font-normal h-9',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜 선택'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* 시간 선택 */}
        <div className="flex gap-1">
          {/* 시간 */}
          <Select value={hour} onValueChange={handleHourChange}>
            <SelectTrigger className="w-[70px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {hours.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}시
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="flex items-center px-1 text-sm">:</span>

          {/* 분 */}
          <Select value={minute} onValueChange={handleMinuteChange}>
            <SelectTrigger className="w-[70px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {minutes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}분
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 선택된 날짜/시간 표시 */}
      {date && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            {format(date, 'MM월 dd일', { locale: ko })} {hour}:{minute}
          </Badge>
        </div>
      )}
    </div>
  );
}