'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AxiosError, AxiosRequestConfig, AxiosHeaders } from 'axios';
import { authApi, type AuthUser, type LoginRequest, type LoginResponse } from '@/lib/api/auth-api';
import { authStorage } from '@/lib/auth-storage';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';

// 인증 컨텍스트 타입
type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  oauth2Login: (provider: 'GOOGLE' | 'APPLE', idToken: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Axios 요청/응답 인터셉터에 토큰 주입 및 자동 갱신 설정
// 한글 주석: refresh 동시 실행을 방지하기 위한 공유 상태
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

function setupAxiosInterceptors() {
  // 한글 주석: Authorization 헤더를 설정(변경)하는 안전한 헬퍼
  const setAuthHeaderOnConfig = (config: AxiosRequestConfig, token: string): void => {
    const h = (config.headers ?? {}) as unknown;
    if (h && typeof (h as AxiosHeaders).set === 'function') {
      (h as AxiosHeaders).set('Authorization', `Bearer ${token}`);
      config.headers = h as AxiosHeaders;
      return;
    }
    // 일반 객체인 경우
    config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` } as any;
  };

  // 요청 시 AccessToken 주입
  apiClient.interceptors.request.use((config) => {
    const token = authStorage.getAccessToken();
    if (token) {
      setAuthHeaderOnConfig(config, token);
    }
    return config;
  });

  // 한글 주석: 401 발생 시 RefreshToken으로 재시도 (동시성 제어 포함)
  apiClient.interceptors.response.use(
    (res) => res,
    async (error: unknown) => {
      const axiosError = error as AxiosError;
      const original = axiosError.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
      const status = axiosError.response?.status;
      if (status === 401 && !original?._retry) {
        if (!original) return Promise.reject(error);
        original._retry = true;
        try {
          const refreshToken = authStorage.getRefreshToken();
          if (!refreshToken) throw new Error('리프레시 토큰이 없습니다');

          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = (async () => {
              try {
                const tokens = await authApi.refresh(refreshToken);
                authStorage.save(tokens);
              } finally {
                isRefreshing = false;
              }
            })();
          }

          await refreshPromise;
          // 갱신 토큰으로 헤더 갱신 후 재요청
          const newAccessToken = authStorage.getAccessToken();
          if (!newAccessToken) throw new Error('액세스 토큰 갱신 실패');
          setAuthHeaderOnConfig(original, newAccessToken);
          return apiClient.request(original);
        } catch {
          authStorage.clear();
          // 한글 주석: 갱신 실패 시 로그인 페이지로 이동
          if (typeof window !== 'undefined') {
            toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(error);
    }
  );
}

let interceptorsInitialized = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 초기화: 인터셉터 1회 설정 + 토큰 있으면 me() 호출
  useEffect(() => {
    if (!interceptorsInitialized) {
      setupAxiosInterceptors();
      interceptorsInitialized = true;
    }

    // 한글 주석: 관리자 계정 체크 (localStorage 우선)
    const adminUserStr = localStorage.getItem('admin_user');
    if (adminUserStr) {
      try {
        const adminUser = JSON.parse(adminUserStr) as AuthUser;
        setUser(adminUser);
        setIsLoading(false);
        return;
      } catch {
        localStorage.removeItem('admin_user');
      }
    }

    const { accessToken } = authStorage.load();
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => authStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    // 로그인 처리: 토큰 저장 + 사용자 상태 반영
    const res: LoginResponse = await authApi.login(payload);
    authStorage.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    setUser(res.user);
    toast.success('로그인 되었습니다');
  }, []);

  const oauth2Login = useCallback(async (provider: 'GOOGLE' | 'APPLE', idToken: string) => {
    // 소셜 로그인 처리: 백엔드 검증 → 토큰 저장 → 사용자 상태 반영
    const res: LoginResponse = await authApi.oauth2Login({
      token: idToken,
      providerType: provider,
    });
    authStorage.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    setUser(res.user);
    toast.success(`${provider === 'GOOGLE' ? 'Google' : 'Apple'}로 로그인되었습니다`);
  }, []);

  const logout = useCallback(async () => {
    try {
      // 한글 주석: 관리자 계정이면 백엔드 호출 스킵
      if (user?.role !== 'ADMIN' || user.id !== 999) {
        await authApi.logout();
      }
    } finally {
      authStorage.clear();
      localStorage.removeItem('admin_user'); // 관리자 계정 정보 삭제
      setUser(null);
      toast.success('로그아웃 되었습니다');
    }
  }, [user]);

  const refresh = useCallback(async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) throw new Error('리프레시 토큰이 없습니다');
    const tokens = await authApi.refresh(refreshToken);
    authStorage.save(tokens);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, refresh, oauth2Login }),
    [user, isLoading, login, logout, refresh, oauth2Login]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용해야 합니다');
  return ctx;
}
