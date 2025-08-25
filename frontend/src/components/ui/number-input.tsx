'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { parseNumberSafe } from '@/lib/utils/number-format';
import { cn } from '@/lib/utils';

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: number | undefined;
  onChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number; // 소수점 자릿수
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, min, max, step = 0.00000001, precision = 8, ...props }, ref) => {
    // 내부 상태로 문자열 값 관리 (사용자 입력 중 형식 유지)
    const [stringValue, setStringValue] = React.useState<string>(() => {
      if (value === undefined || value === null) return '';
      return String(value);
    });

    // value prop이 변경될 때 내부 상태 업데이트
    React.useEffect(() => {
      if (value === undefined || value === null) {
        setStringValue('');
      } else {
        // 지수 표기법 방지
        const formatted = value.toFixed(precision);
        const trimmed = formatted.replace(/\.?0+$/, '');
        setStringValue(trimmed);
      }
    }, [value, precision]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // 빈 문자열 허용
      if (inputValue === '') {
        setStringValue('');
        onChange?.(undefined);
        return;
      }

      // 음수 기호만 입력된 경우
      if (inputValue === '-') {
        setStringValue('-');
        return;
      }

      // 소수점으로 시작하는 경우 0 추가
      if (inputValue === '.') {
        setStringValue('0.');
        return;
      }

      // 유효한 숫자 패턴 체크 (음수, 소수점 포함)
      const validPattern = /^-?\d*\.?\d*$/;
      if (!validPattern.test(inputValue)) {
        return; // 유효하지 않은 입력은 무시
      }

      // 소수점 자릿수 제한
      const parts = inputValue.split('.');
      if (parts[1] && parts[1].length > precision) {
        return; // 지정된 precision보다 긴 소수는 무시
      }

      setStringValue(inputValue);

      // 완전한 숫자인 경우에만 onChange 호출
      const numValue = parseNumberSafe(inputValue);
      if (numValue !== undefined) {
        // min/max 체크
        if (min !== undefined && numValue < min) return;
        if (max !== undefined && numValue > max) return;
        
        onChange?.(numValue);
      }
    };

    const handleBlur = () => {
      // 블러 시 값 정리
      if (stringValue === '-' || stringValue === '.' || stringValue === '-.') {
        setStringValue('');
        onChange?.(undefined);
        return;
      }

      const numValue = parseNumberSafe(stringValue);
      if (numValue !== undefined) {
        // 지수 표기법 방지하여 다시 포맷
        const formatted = numValue.toFixed(precision);
        const trimmed = formatted.replace(/\.?0+$/, '');
        setStringValue(trimmed);
      }
    };

    // 화살표 키로 값 증감
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); // 기본 동작 방지

        const currentValue = parseNumberSafe(stringValue) || 0;
        const stepValue = step || 1;
        
        let newValue: number;
        if (e.key === 'ArrowUp') {
          newValue = currentValue + stepValue;
        } else {
          newValue = currentValue - stepValue;
        }

        // min/max 체크
        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;

        // 지수 표기법 방지
        const formatted = newValue.toFixed(precision);
        const trimmed = formatted.replace(/\.?0+$/, '');
        setStringValue(trimmed);
        onChange?.(newValue);
      }
    };

    return (
      <Input
        ref={ref}
        type="text" // number 대신 text 사용하여 더 나은 제어
        inputMode="decimal" // 모바일에서 숫자 키패드 표시
        className={cn(className)}
        value={stringValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';

export { NumberInput };