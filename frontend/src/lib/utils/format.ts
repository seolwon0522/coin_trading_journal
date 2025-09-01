/**
 * 숫자 포맷팅 유틸리티 함수들
 */

/**
 * 가격을 포맷팅합니다
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
 * 숫자를 천 단위 구분자와 함께 포맷팅합니다
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
 * 퍼센트를 포맷팅합니다
 * @param value 값
 * @param decimals 소수점 자리수
 * @returns 포맷팅된 퍼센트 문자열
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const formatted = value.toFixed(decimals);
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatted}%`;
}

/**
 * 날짜를 포맷팅합니다
 * @param date 날짜
 * @param includeTime 시간 포함 여부
 * @returns 포맷팅된 날짜 문자열
 */
export function formatDate(date: string | Date, includeTime: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (includeTime) {
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 짧은 숫자 포맷 (K, M, B)
 * @param value 숫자
 * @returns 포맷팅된 문자열
 */
export function formatShortNumber(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}