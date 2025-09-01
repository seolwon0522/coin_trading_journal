import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authStorage } from './auth-storage';
import { authApi } from './api/auth-api';

// API 클라이언트 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// 리프레시 토큰 진행 중 플래그
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request 인터셉터 - 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response 인터셉터 - 토큰 자동 갱신
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // 401 에러 처리
    if (error.response?.status === 401 && !originalRequest._retry) {
      // refresh 엔드포인트 자체가 실패한 경우
      if (originalRequest.url?.includes('/auth/refresh')) {
        authStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      if (isRefreshing) {
        // 이미 리프레시 중이면 대기
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = authStorage.getRefreshToken();
      
      if (!refreshToken) {
        authStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        const response = await authApi.refresh(refreshToken);
        const { accessToken, refreshToken: newRefreshToken } = response;
        
        authStorage.save({
          accessToken,
          refreshToken: newRefreshToken,
        });
        
        processQueue(null, accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        authStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);