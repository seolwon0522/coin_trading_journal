/**
 * 전문 거래소 스타일 숫자 포맷팅 유틸리티
 */

/**
 * 스마트 가격 포맷팅
 * - 큰 숫자는 천 단위 구분
 * - 작은 숫자는 유효 숫자 표시
 */
export function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  // 1억 이상
  if (num >= 100000000) {
    return num.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  }
  // 10000 이상
  if (num >= 10000) {
    return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
  // 100 이상
  if (num >= 100) {
    return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }
  // 1 이상
  if (num >= 1) {
    return num.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  }
  // 0.01 이상
  if (num >= 0.01) {
    return num.toLocaleString('ko-KR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  }
  // 0.0001 이상
  if (num >= 0.0001) {
    return num.toLocaleString('ko-KR', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    });
  }
  // 매우 작은 숫자
  if (num > 0 && num < 0.0001) {
    // 유효 숫자 표시
    const decimals = Math.max(8, -Math.floor(Math.log10(num)) + 2);
    return num.toFixed(Math.min(decimals, 10));
  }

  return '0';
}

/**
 * 스마트 수량 포맷팅
 * - 큰 수량은 K, M, B 단위
 * - 작은 수량은 적절한 소수점
 */
export function formatQuantity(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  // 10억 이상 - B 단위
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(3)}B`;
  }
  // 100만 이상 - M 단위
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(3)}M`;
  }
  // 1000 이상 - K 단위
  if (num >= 1000) {
    return `${(num / 1000).toFixed(3)}K`;
  }
  // 100 이상 - 소수점 2자리
  if (num >= 100) {
    return num.toFixed(2);
  }
  // 10 이상 - 소수점 3자리
  if (num >= 10) {
    return num.toFixed(3);
  }
  // 1 이상 - 소수점 4자리
  if (num >= 1) {
    return num.toFixed(4);
  }
  // 0.01 이상 - 소수점 6자리
  if (num >= 0.01) {
    return num.toFixed(6);
  }
  // 매우 작은 수량
  if (num > 0 && num < 0.01) {
    const decimals = Math.max(8, -Math.floor(Math.log10(num)) + 2);
    return num.toFixed(Math.min(decimals, 10));
  }

  return '0';
}

/**
 * 거래량 포맷팅 (달러 표시)
 */
export function formatVolume(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '$0';

  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(2)}B`;
  }
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  }

  return `$${num.toFixed(2)}`;
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0.00%';

  const formatted = Math.abs(num).toFixed(2);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';

  return `${sign}${formatted}%`;
}

/**
 * 컴팩트 숫자 포맷팅 (호가창용)
 */
export function formatCompact(value: string | number, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '0';

  // 정수부 길이 확인
  const integerLength = Math.floor(Math.abs(num)).toString().length;

  // 천만 이상은 M 단위
  if (num >= 10000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  // 만 이상은 K 단위
  if (num >= 10000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  // 작은 숫자는 유효숫자 표시
  if (num < 1 && num > 0) {
    const significantDigits = -Math.floor(Math.log10(num)) + decimals;
    return num.toFixed(Math.min(significantDigits, 8));
  }

  // 일반 숫자
  return num.toFixed(decimals);
}

/**
 * 시간 포맷팅
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * 거래소 스타일 색상 클래스
 */
export function getPriceColorClass(change: number): string {
  if (change > 0) return 'text-emerald-500';
  if (change < 0) return 'text-red-500';
  return 'text-gray-400';
}

export function getBackgroundColorClass(side: 'BUY' | 'SELL'): string {
  if (side === 'BUY') return 'bg-emerald-500/10';
  if (side === 'SELL') return 'bg-red-500/10';
  return 'bg-gray-500/10';
}