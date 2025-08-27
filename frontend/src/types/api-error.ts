/**
 * API 에러 타입 정의
 * 
 * @module types/api-error
 * @description API 호출 시 발생하는 에러를 표준화된 타입으로 정의
 */

export interface ApiError {
  response?: {
    status: number;
    data?: {
      message?: string;
      error?: string;
      details?: any;
    };
  };
  message: string;
  code?: string;
}

/**
 * 에러가 ApiError 타입인지 확인하는 타입 가드
 * 
 * @param error 확인할 에러 객체
 * @returns ApiError 타입 여부
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * 에러 메시지 추출 헬퍼 함수
 * 
 * @param error 에러 객체
 * @returns 사용자 친화적인 에러 메시지
 */
export function extractErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    // API 응답에서 메시지 우선 사용
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    // 기본 에러 메시지
    return error.message;
  }
  
  // Error 인스턴스인 경우
  if (error instanceof Error) {
    return error.message;
  }
  
  // 알 수 없는 에러
  return '알 수 없는 오류가 발생했습니다';
}

/**
 * HTTP 상태 코드별 기본 메시지
 */
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: '잘못된 요청입니다',
  401: '로그인이 필요합니다',
  403: '접근 권한이 없습니다',
  404: '요청한 리소스를 찾을 수 없습니다',
  500: '서버 오류가 발생했습니다',
  502: '서버가 일시적으로 사용 불가능합니다',
  503: '서비스를 일시적으로 사용할 수 없습니다',
};