/**
 * 인증 관련 상수 정의
 * 토큰 키 이름을 중앙 관리하여 유지보수성 향상
 */
export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_KEY: 'accessToken',
  REFRESH_TOKEN_KEY: 'refreshToken',
  BEARER_PREFIX: 'Bearer ',
} as const;

/**
 * API 엔드포인트 상수
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    OAUTH2: '/api/auth/oauth2',
  },
  TRADES: '/api/trades',
  STATISTICS: '/api/statistics',
  MARKET: '/api/market',
  API_KEYS: '/api/api-keys',
} as const;

/**
 * HTTP 상태 코드
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;