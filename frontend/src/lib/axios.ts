import axios from 'axios';
import { authStorage } from './auth-storage';

// 심플한 API 클라이언트 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 10초 → 120초 (2분)
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // JWT 인증은 헤더 사용, 쿠키 불필요
});

// Request interceptor - 토큰 추가 및 로깅
apiClient.interceptors.request.use(
  (config) => {
    // 토큰 추가 (F5 새로고침 시에도 즉시 토큰이 포함되도록)
    const token = authStorage.getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 Token added from localStorage on page refresh');
      }
    }
    
    // 개발 환경 로깅
    if (process.env.NODE_ENV === 'development') {
      const authHeader = config.headers.Authorization;
      const hasToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, 
        hasToken ? '(with token)' : '(no token)');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// alert 중복 방지를 위한 플래그
let isRedirecting = false;
let lastAlertTime = 0;

// 에러 처리 - 인증 관련 에러 강화
apiClient.interceptors.response.use(
  (response) => {
    // 개발 환경 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.response?.data);
    }
    
    // 401 Unauthorized: 인증 토큰 없거나 만료
    if (error.response?.status === 401) {
      // trades API의 경우 조용히 실패 (메인 페이지 등에서 사용)
      if (error.config?.url?.includes('/trades')) {
        console.warn('⚠️ 로그인이 필요한 기능입니다.');
        return Promise.reject(error);
      }
      
      // 이미 리다이렉트 중이면 중복 실행 방지
      if (!isRedirecting) {
        isRedirecting = true;
        console.error('🔒 인증이 필요합니다. 로그인 페이지로 이동합니다.');
        
        // 토큰 제거 (authStorage 사용)
        authStorage.clear();
        
        // 로그인 페이지로 리다이렉트 (auth 관련 API 제외)
        if (!error.config?.url?.includes('/auth/')) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    
    // 403 Forbidden: 권한 없음 (다른 유저의 리소스 접근 시도)
    if (error.response?.status === 403) {
      console.error('⛔ 권한이 없습니다. 접근이 거부되었습니다.');
      
      // 1초에 한 번만 alert 표시 (중복 방지)
      const now = Date.now();
      if (now - lastAlertTime > 1000) {
        lastAlertTime = now;
        // toast가 있으면 toast 사용, 없으면 console.warn만 사용
        console.warn('권한이 없습니다. 본인의 데이터만 접근할 수 있습니다.');
      }
    }
    
    return Promise.reject(error);
  }
);