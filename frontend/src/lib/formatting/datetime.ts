/**
 * 날짜/시간 포맷팅 유틸리티
 *
 * @module formatting/datetime
 * @description 날짜 및 시간 포맷팅 관련 유틸리티
 */

interface DateFormatOptions {
  locale?: string;
  includeTime?: boolean;
  includeSeconds?: boolean;
  format?: 'short' | 'long' | 'full';
}

/**
 * 날짜를 포맷팅
 * @param date 날짜
 * @param options 포맷 옵션
 * @returns 포맷팅된 날짜 문자열
 */
export function formatDate(date: string | Date, options?: DateFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions = {
    locale: 'ko-KR',
    includeTime: false,
    includeSeconds: false,
    format: 'short' as const,
    ...options
  };

  if (defaultOptions.includeTime) {
    const timeOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };

    if (defaultOptions.includeSeconds) {
      timeOptions.second = '2-digit';
    }

    return d.toLocaleString(defaultOptions.locale, timeOptions);
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (defaultOptions.format === 'long') {
    dateOptions.month = 'long';
    dateOptions.weekday = 'long';
  } else if (defaultOptions.format === 'full') {
    dateOptions.month = 'long';
    dateOptions.weekday = 'long';
    dateOptions.era = 'short';
  }

  return d.toLocaleDateString(defaultOptions.locale, dateOptions);
}

/**
 * 시간을 포맷팅
 * @param date 날짜/시간
 * @param includeSeconds 초 포함 여부
 * @returns 포맷팅된 시간 문자열
 */
export function formatTime(date: string | Date, includeSeconds: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  if (includeSeconds) {
    options.second = '2-digit';
  }

  return d.toLocaleTimeString('ko-KR', options);
}

/**
 * 상대 시간 포맷팅 (예: 5분 전, 2일 전)
 * @param date 날짜
 * @param locale 로케일
 * @returns 상대 시간 문자열
 */
export function formatRelativeTime(date: string | Date, locale: string = 'ko-KR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (days > 0) {
    return rtf.format(-days, 'day');
  } else if (hours > 0) {
    return rtf.format(-hours, 'hour');
  } else if (minutes > 0) {
    return rtf.format(-minutes, 'minute');
  } else {
    return rtf.format(-seconds, 'second');
  }
}

/**
 * ISO 날짜 문자열 생성
 * @param date 날짜 (선택적)
 * @returns ISO 형식의 날짜 문자열
 */
export function toISOString(date?: Date): string {
  return (date || new Date()).toISOString();
}

/**
 * 날짜 포맷 템플릿 적용
 * @param date 날짜
 * @param template 템플릿 문자열 (예: 'YYYY-MM-DD')
 * @returns 포맷팅된 날짜 문자열
 */
export function formatDateTemplate(date: string | Date, template: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return template
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}