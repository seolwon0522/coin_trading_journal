/**
 * 백엔드 API 응답 공통 구조
 * Spring Boot의 ApiResponse 래퍼와 일치
 */

/**
 * API 응답 래퍼 타입
 * 모든 백엔드 API 응답은 이 구조로 래핑됨
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  error?: ApiError;
}

/**
 * API 에러 구조
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * 페이지네이션 응답
 */
export interface PageableResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      ascending: boolean;
      descending: boolean;
    };
  };
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

/**
 * API 응답 헬퍼 함수
 */
export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } => {
  return response.success === true && response.data !== null && response.data !== undefined;
};

/**
 * API 에러 체크 함수
 */
export const isApiError = (response: ApiResponse): response is ApiResponse & { error: ApiError } => {
  return response.success === false && response.error !== undefined;
};

/**
 * API 응답에서 데이터 추출
 */
export const extractApiData = <T>(response: ApiResponse<T>): T => {
  // response가 ApiResponse 타입인지 확인
  if (!response || typeof response !== 'object') {
    console.error('Invalid response:', response);
    throw new Error('잘못된 응답 형식입니다');
  }
  
  // success 필드가 없는 경우 (인증 오류 등)
  if (!('success' in response)) {
    console.error('Response missing success field:', response);
    // 401 에러 등 Spring Security 에러 응답 처리
    if ('status' in response || 'error' in response) {
      throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
    }
    throw new Error('잘못된 응답 형식입니다');
  }
  
  // success가 false이거나 undefined인 경우
  if (response.success !== true) {
    const errorMessage = response.error?.message || response.message || '알 수 없는 오류가 발생했습니다';
    console.error('API Error:', errorMessage, response);
    throw new Error(errorMessage);
  }
  
  // data가 null 또는 undefined인 경우 처리
  if (response.data === null || response.data === undefined) {
    console.warn('Response has no data:', response);
    // void 타입이나 빈 응답인 경우를 위해 undefined as T 반환
    return undefined as unknown as T;
  }
  
  return response.data;
};