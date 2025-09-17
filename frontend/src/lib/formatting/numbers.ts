/**
 * 숫자 포맷팅 유틸리티
 *
 * @module formatting/numbers
 * @description 숫자 포맷팅, 파싱, 변환 관련 통합 유틸리티
 */

interface NumberFormatOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

/**
 * 숫자를 천 단위 구분자와 함께 포맷팅
 * @param value 숫자
 * @param decimals 소수점 자리수
 * @returns 포맷팅된 숫자 문자열
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  // 소수점 처리
  const fixed = num.toFixed(decimals);

  // 천 단위 구분자 추가
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // 불필요한 0 제거
  if (parts[1]) {
    parts[1] = parts[1].replace(/0+$/, '');
    if (parts[1] === '') {
      return parts[0];
    }
  }

  return parts.join('.');
}

/**
 * 로케일 기반 숫자 포맷팅 (국제화 지원)
 * @param value 포맷할 숫자
 * @param options 포맷 옵션
 * @returns 포맷된 문자열
 */
export function formatNumberIntl(value: number, options?: NumberFormatOptions): string {
  if (!value && value !== 0) return '0';

  const defaultOptions = {
    locale: 'ko-KR',
    maximumFractionDigits: 8,
    useGrouping: true,
    ...options
  };

  return new Intl.NumberFormat(defaultOptions.locale, {
    maximumFractionDigits: defaultOptions.maximumFractionDigits,
    minimumFractionDigits: defaultOptions.minimumFractionDigits,
    useGrouping: defaultOptions.useGrouping,
  }).format(value);
}

/**
 * 짧은 숫자 포맷 (K, M, B)
 * @param value 숫자
 * @param decimals 소수점 자리수
 * @returns 포맷팅된 문자열
 */
export function formatShortNumber(value: number, decimals: number = 2): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(decimals)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

/**
 * 숫자를 지수 표기법 없이 문자열로 변환
 * @param value 변환할 값
 * @param maxDecimals 최대 소수점 자리수
 * @returns 지수 표기법 없는 문자열
 */
export function formatNumberToString(value: number | string | undefined | null, maxDecimals: number = 8): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '';
  }

  // 매우 작은 숫자도 지수 표기법 없이 표시
  const formatted = numValue.toFixed(maxDecimals);
  const trimmed = formatted.replace(/\.?0+$/, '');

  return trimmed;
}

/**
 * 표시용 숫자 포맷터
 * @param value 표시할 값
 * @param decimals 소수점 자리수
 * @returns 포맷된 문자열 또는 대시
 */
export function formatDisplayNumber(value: number | undefined | null, decimals: number = 8): string {
  if (value === undefined || value === null) {
    return '-';
  }

  const formatted = value.toFixed(decimals);
  return formatted.replace(/\.?0+$/, '');
}

/**
 * 입력 필드용 숫자 포맷터
 * @param value 입력값
 * @returns 유효한 숫자 형식의 문자열
 */
export function formatInputNumber(value: string): string {
  if (!value) return '';

  // 소수점으로 끝나는 경우 그대로 유지
  if (value.endsWith('.')) return value;

  // 0으로 끝나는 소수 그대로 유지
  if (value.includes('.') && value.match(/\.\d*0$/)) return value;

  // 숫자가 아닌 경우 빈 문자열 반환
  const num = parseFloat(value);
  if (isNaN(num)) return '';

  return value;
}

/**
 * 포맷된 문자열을 숫자로 파싱
 * @param value 파싱할 문자열
 * @returns 파싱된 숫자 또는 0
 */
export function parseNumber(value: string): number {
  if (!value) return 0;
  // 콤마 제거 후 파싱
  return parseFloat(value.replace(/,/g, '')) || 0;
}

/**
 * 문자열을 숫자로 안전하게 변환
 * @param value 변환할 문자열
 * @returns 숫자 또는 undefined
 */
export function parseNumberSafe(value: string | undefined | null): number | undefined {
  if (!value || value === '') {
    return undefined;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}