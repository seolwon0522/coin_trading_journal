import axios from 'axios';

// 심플한 API 클라이언트 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 전송을 위해 추가
});

// 토큰 자동 추가 (localStorage 체크)
apiClient.interceptors.request.use(
  (config) => {
    // localStorage에서 토큰 확인 (있으면 추가)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 개발 환경 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// 에러 처리 단순화
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
    
    // 401 에러는 로그인 페이지로 리다이렉트하지 않음 (개발 중에는)
    // 403 에러도 개발 중에는 그냥 로그만 출력
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('⚠️ Authentication issue, but continuing in dev mode');
    }
    
    return Promise.reject(error);
  }
);