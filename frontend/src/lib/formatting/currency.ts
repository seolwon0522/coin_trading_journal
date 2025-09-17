/**
 * 통화 관련 포맷팅 유틸리티
 *
 * @module formatting/currency
 * @description 통화 포맷팅 관련 통합 유틸리티
 */

interface CurrencyFormatOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * USD 통화 포맷팅
 * @param value 포맷할 달러 금액
 * @param options 포맷 옵션
 * @returns 포맷된 달러 문자열
 */
export function formatUSD(value: number, options?: CurrencyFormatOptions): string {
  const defaultOptions = {
    locale: 'en-US',
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 8 : 2,
    ...options
  };

  return new Intl.NumberFormat(defaultOptions.locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: defaultOptions.minimumFractionDigits,
    maximumFractionDigits: defaultOptions.maximumFractionDigits,
  }).format(value);
}

/**
 * KRW 통화 포맷팅
 * @param value 포맷할 원화 금액
 * @param options 포맷 옵션
 * @returns 포맷된 원화 문자열
 */
export function formatKRW(value: number, options?: CurrencyFormatOptions): string {
  const defaultOptions = {
    locale: 'ko-KR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  };

  return new Intl.NumberFormat(defaultOptions.locale, {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: defaultOptions.minimumFractionDigits,
    maximumFractionDigits: defaultOptions.maximumFractionDigits,
  }).format(value);
}

/**
 * 통화 포맷팅 (USD/KRW 자동 선택)
 * @param value 포맷할 금액
 * @param currency 통화 타입
 * @param options 포맷 옵션
 * @returns 포맷된 통화 문자열
 */
export function formatCurrency(
  value: number,
  currency: 'USD' | 'KRW',
  options?: CurrencyFormatOptions
): string {
  if (currency === 'USD') {
    return formatUSD(value, options);
  }
  return formatKRW(value, options);
}

/**
 * 가격 포맷팅 (암호화폐 가격용)
 * @param price 가격
 * @param decimals 소수점 자리수
 * @returns 포맷팅된 가격 문자열
 */
export function formatPrice(price: number | string, decimals: number = 2): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(num)) return '0';

  // 1보다 작은 수는 더 많은 소수점 표시
  if (num > 0 && num < 1) {
    return num.toFixed(6);
  }

  // 100보다 큰 수는 소수점 2자리
  if (num >= 100) {
    return num.toFixed(2);
  }

  // 그 외는 지정된 소수점 자리수
  return num.toFixed(decimals);
}

/**
 * 퍼센트 포맷팅
 * @param value 퍼센트 값
 * @param decimals 소수점 자리수
 * @param showSign 부호 표시 여부
 * @returns 포맷팅된 퍼센트 문자열
 */
export function formatPercent(value: number, decimals: number = 2, showSign: boolean = true): string {
  const formatted = value.toFixed(decimals);
  const prefix = showSign && value > 0 ? '+' : '';
  return `${prefix}${formatted}%`;
}