/**
 * 애플리케이션 전역 상수
 * @module constants/app
 * @description 앱 전반에 사용되는 상수값들을 중앙 관리
 */

/**
 * 환율 관련 상수
 */
export const EXCHANGE_RATES = {
  /** 기본 USD/KRW 환율 (API 실패 시 사용) */
  DEFAULT_USD_KRW: 1320,

  /** 환율 업데이트 주기 (밀리초) */
  UPDATE_INTERVAL: 30 * 60 * 1000, // 30분

  /** 환율 캐시 유효 시간 (밀리초) */
  CACHE_TTL: 30 * 60 * 1000, // 30분

  /** API 엔드포인트 */
  PRIMARY_API: 'https://api.exchangerate-api.com/v4/latest/USD',
  BACKUP_API: 'https://api.exchangerate.host/latest?base=USD&symbols=KRW',
} as const;

/**
 * UI 관련 상수
 */
export const UI_CONSTANTS = {
  /** 데모 모드 업데이트 간격 (밀리초) */
  DEMO_INTERVAL: 1500,

  /** 애니메이션 지속 시간 (밀리초) */
  ANIMATION_DURATION: 300,

  /** 토스트 메시지 표시 시간 (밀리초) */
  TOAST_DURATION: 4000,

  /** 디바운스 지연 시간 (밀리초) */
  DEBOUNCE_DELAY: 300,

  /** 무한 스크롤 임계값 (픽셀) */
  INFINITE_SCROLL_THRESHOLD: 100,
} as const;

/**
 * API 관련 상수
 */
export const API_CONSTANTS = {
  /** API 기본 URL */
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',

  /** API 타임아웃 (밀리초) */
  TIMEOUT: 30000, // 30초

  /** 재시도 횟수 */
  RETRY_COUNT: 3,

  /** 재시도 지연 시간 (밀리초) */
  RETRY_DELAY: 1000,

  /** 페이지 크기 */
  DEFAULT_PAGE_SIZE: 20,

  /** 최대 페이지 크기 */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * 거래 관련 상수
 */
export const TRADE_CONSTANTS = {
  /** 최소 거래 금액 (USD) */
  MIN_TRADE_AMOUNT: 10,

  /** 최대 거래 금액 (USD) */
  MAX_TRADE_AMOUNT: 1000000,

  /** 기본 수수료율 (%) */
  DEFAULT_FEE_RATE: 0.1,

  /** 최소 수량 */
  MIN_QUANTITY: 0.00000001,

  /** 최대 수량 */
  MAX_QUANTITY: 999999999,

  /** 가격 소수점 자리수 */
  PRICE_DECIMALS: {
    BTC: 2,
    ETH: 2,
    ALT: 6, // 알트코인
  },

  /** 수량 소수점 자리수 */
  QUANTITY_DECIMALS: {
    BTC: 8,
    ETH: 6,
    ALT: 4,
  },
} as const;

/**
 * 웹소켓 관련 상수
 */
export const WEBSOCKET_CONSTANTS = {
  /** 재연결 시도 횟수 */
  RECONNECT_ATTEMPTS: 5,

  /** 재연결 지연 시간 (밀리초) */
  RECONNECT_DELAY: 3000,

  /** 핑 간격 (밀리초) */
  PING_INTERVAL: 30000, // 30초

  /** 타임아웃 시간 (밀리초) */
  TIMEOUT: 60000, // 1분

  /** 바이낸스 웹소켓 URL */
  BINANCE_WS_URL: 'wss://stream.binance.com:9443/ws',
} as const;

/**
 * 차트 관련 상수
 */
export const CHART_CONSTANTS = {
  /** 차트 인터벌 옵션 */
  INTERVALS: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'] as const,

  /** 기본 인터벌 */
  DEFAULT_INTERVAL: '1h',

  /** 차트 캔들 개수 */
  CANDLE_COUNT: 100,

  /** 차트 업데이트 간격 (밀리초) */
  UPDATE_INTERVAL: 1000,

  /** 차트 색상 */
  COLORS: {
    UP: '#10b981', // green-500
    DOWN: '#ef4444', // red-500
    NEUTRAL: '#6b7280', // gray-500
  },
} as const;

/**
 * 포트폴리오 관련 상수
 */
export const PORTFOLIO_CONSTANTS = {
  /** 포트폴리오 업데이트 주기 (밀리초) */
  UPDATE_INTERVAL: 10000, // 10초

  /** 캐시 유효 시간 (밀리초) */
  CACHE_TTL: 5 * 60 * 1000, // 5분

  /** 최소 잔고 표시 금액 (USD) */
  MIN_DISPLAY_BALANCE: 0.01,

  /** 위험도 레벨 */
  RISK_LEVELS: {
    LOW: 0.2, // 20%
    MEDIUM: 0.5, // 50%
    HIGH: 0.8, // 80%
  },
} as const;

/**
 * 검증 관련 상수
 */
export const VALIDATION_CONSTANTS = {
  /** 이메일 정규식 */
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /** 비밀번호 최소 길이 */
  MIN_PASSWORD_LENGTH: 8,

  /** 비밀번호 최대 길이 */
  MAX_PASSWORD_LENGTH: 100,

  /** 사용자명 최소 길이 */
  MIN_USERNAME_LENGTH: 3,

  /** 사용자명 최대 길이 */
  MAX_USERNAME_LENGTH: 30,

  /** API 키 길이 */
  API_KEY_LENGTH: 64,

  /** 시크릿 키 길이 */
  SECRET_KEY_LENGTH: 64,
} as const;

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  /** 사용자 토큰 */
  AUTH_TOKEN: 'auth_token',

  /** 사용자 정보 */
  USER_INFO: 'user_info',

  /** 환율 정보 */
  EXCHANGE_RATE: 'exchangeRate',

  /** 테마 설정 */
  THEME: 'theme',

  /** 언어 설정 */
  LOCALE: 'locale',

  /** 선호 통화 */
  PREFERRED_CURRENCY: 'preferred_currency',

  /** 최근 검색 기록 */
  RECENT_SEARCHES: 'recent_searches',
} as const;

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  /** 네트워크 에러 */
  NETWORK_ERROR: '네트워크 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',

  /** 인증 에러 */
  AUTH_ERROR: '인증이 필요합니다. 다시 로그인해주세요.',

  /** 권한 에러 */
  PERMISSION_ERROR: '해당 작업을 수행할 권한이 없습니다.',

  /** 유효성 검사 에러 */
  VALIDATION_ERROR: '입력값을 확인해주세요.',

  /** 서버 에러 */
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',

  /** 타임아웃 에러 */
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다. 다시 시도해주세요.',

  /** 알 수 없는 에러 */
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
} as const;

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  /** 저장 성공 */
  SAVE_SUCCESS: '저장되었습니다.',

  /** 삭제 성공 */
  DELETE_SUCCESS: '삭제되었습니다.',

  /** 업데이트 성공 */
  UPDATE_SUCCESS: '업데이트되었습니다.',

  /** 복사 성공 */
  COPY_SUCCESS: '클립보드에 복사되었습니다.',

  /** 로그인 성공 */
  LOGIN_SUCCESS: '로그인되었습니다.',

  /** 로그아웃 성공 */
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
} as const;