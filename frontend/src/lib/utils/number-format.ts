/**
 * 암호화폐 거래에서 사용하는 숫자 포맷팅 유틸리티
 */

/**
 * 숫자를 지수 표기법 없이 문자열로 변환
 * JavaScript의 자동 지수 표기법 변환을 방지
 */
export function formatNumberToString(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '';
  }

  // 매우 작은 숫자도 지수 표기법 없이 표시
  // toFixed(8)로 최대 8자리까지 표시하고, 불필요한 0 제거
  const formatted = numValue.toFixed(8);
  const trimmed = formatted.replace(/\.?0+$/, '');
  
  return trimmed;
}

/**
 * 문자열을 숫자로 안전하게 변환
 * 빈 문자열이나 잘못된 입력 처리
 */
export function parseNumberSafe(value: string | undefined | null): number | undefined {
  if (!value || value === '') {
    return undefined;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * 입력 필드용 숫자 포맷터
 * 사용자가 입력하는 동안 유효한 숫자 형식 유지
 */
export function formatInputNumber(value: string): string {
  // 빈 문자열은 그대로 반환
  if (!value) return '';
  
  // 소수점으로 끝나는 경우 (예: "1.") 그대로 유지
  if (value.endsWith('.')) return value;
  
  // 0으로 끝나는 소수 (예: "1.10") 그대로 유지
  if (value.includes('.') && value.match(/\.\d*0$/)) return value;
  
  // 숫자가 아닌 경우 빈 문자열 반환
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  
  // 지수 표기법으로 변환되지 않도록 문자열로 처리
  return value;
}

/**
 * 표시용 숫자 포맷터
 * 화면에 표시할 때 적절한 형식으로 변환
 */
export function formatDisplayNumber(value: number | undefined | null, decimals: number = 8): string {
  if (value === undefined || value === null) {
    return '-';
  }

  // 매우 작은 숫자도 지수 표기법 없이 표시
  const formatted = value.toFixed(decimals);
  // 불필요한 뒤쪽 0 제거
  return formatted.replace(/\.?0+$/, '');
}