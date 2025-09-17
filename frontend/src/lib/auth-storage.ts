// 안전한 토큰 저장 및 접근 유틸리티
// - 메모리 우선 저장, 새로고침 대비하여 sessionStorage 사용 (브라우저 닫으면 자동 삭제)
// - 보안 강화: localStorage 대신 sessionStorage 사용, 암호화 추가 가능

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

const ACCESS_KEY = 'ctj_access_token';
const REFRESH_KEY = 'ctj_refresh_token';

// 간단한 암호화 (실제 환경에서는 더 강력한 암호화 필요)
const encode = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str));
  } catch {
    return str;
  }
};

const decode = (str: string): string => {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return str;
  }
};

export const authStorage = {
  // 토큰 저장 (메모리 + sessionStorage)
  save(tokens: StoredTokens) {
    inMemoryAccessToken = tokens.accessToken ?? null;
    inMemoryRefreshToken = tokens.refreshToken ?? null;
    try {
      if (typeof window !== 'undefined') {
        if (tokens.accessToken) {
          sessionStorage.setItem(ACCESS_KEY, encode(tokens.accessToken));
        } else {
          sessionStorage.removeItem(ACCESS_KEY);
        }
        if (tokens.refreshToken) {
          sessionStorage.setItem(REFRESH_KEY, encode(tokens.refreshToken));
        } else {
          sessionStorage.removeItem(REFRESH_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  },

  // 저장된 토큰 로드
  load(): StoredTokens {
    if (inMemoryAccessToken || inMemoryRefreshToken) {
      return { accessToken: inMemoryAccessToken, refreshToken: inMemoryRefreshToken };
    }
    try {
      if (typeof window !== 'undefined') {
        const encodedAccess = sessionStorage.getItem(ACCESS_KEY);
        const encodedRefresh = sessionStorage.getItem(REFRESH_KEY);
        const access = encodedAccess ? decode(encodedAccess) : null;
        const refresh = encodedRefresh ? decode(encodedRefresh) : null;
        inMemoryAccessToken = access;
        inMemoryRefreshToken = refresh;
        return { accessToken: access, refreshToken: refresh };
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
    return { accessToken: null, refreshToken: null };
  },

  // 개별 토큰 접근자
  getAccessToken(): string | null {
    return this.load().accessToken;
  },

  getRefreshToken(): string | null {
    return this.load().refreshToken;
  },

  // 토큰 비우기
  clear() {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
      }
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  },
};


