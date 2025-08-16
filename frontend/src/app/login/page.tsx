'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/components/providers/auth-provider';
import Script from 'next/script';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { authStorage } from '@/lib/auth-storage';

// 로그인 폼 검증 스키마
const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, oauth2Login } = useAuth();
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      // 한글 주석: 관리자 계정 하드코딩 체크
      if (values.email === 'admin@ml.com' && values.password === 'ml_admin_2025') {
        // 관리자 계정으로 직접 로그인 처리 (백엔드 우회)
        const adminUser = {
          id: 999,
          email: 'admin@ml.com',
          name: 'ML 관리자',
          role: 'ADMIN' as const,
          isActive: true,
          providerType: 'LOCAL' as const,
        };

        // 가짜 토큰 저장 (관리자용)
        const fakeTokens = {
          accessToken: 'admin_access_token_' + Date.now(),
          refreshToken: 'admin_refresh_token_' + Date.now(),
        };

        // auth context 업데이트를 위해 수동으로 처리
        authStorage.save(fakeTokens);

        // 사용자 상태 직접 설정을 위해 window reload 사용
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
        window.location.reload();
        return;
      }

      await login(values);
      router.replace('/');
    } catch (error) {
      form.setError('root', {
        type: 'server',
        message: (error as any)?.message || '로그인에 실패했습니다',
      });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-sm bg-card border rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-1">로그인</h1>
        <p className="text-sm text-muted-foreground mb-6">이메일과 비밀번호를 입력하세요</p>

        {/* Apple JS SDK만 로드 (FedCM/GSI는 비활성화) */}
        <Script
          id="apple-js"
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          strategy="afterInteractive"
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 이메일 입력 */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 비밀번호 입력 */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="비밀번호"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </Form>

        {/* 관리자 빠른 로그인 */}
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              form.setValue('email', 'admin@ml.com');
              form.setValue('password', 'ml_admin_2025');
            }}
          >
            관리자 계정으로 빠른 로그인
          </Button>
        </div>

        {/* 구분선 */}
        <div className="my-4 text-center text-sm text-muted-foreground">또는</div>

        {/* Google 로그인 버튼 (FedCM 비활성화: 직접 OAuth2 리다이렉트) */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full mb-2 h-11"
          disabled={googleLoading}
          onClick={async () => {
            try {
              // 1) 환경 변수 확인
              const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
              if (!clientId)
                throw new Error('환경변수 NEXT_PUBLIC_GOOGLE_CLIENT_ID 가 설정되지 않았습니다');
              setGoogleLoading(true);

              // 2) 리디렉트 URI 구성 (서버/클라이언트 모두 동일 경로 사용)
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              const redirectUri = `${origin}/auth/google/callback`;

              // 3) FedCM/GSI를 사용하지 않고 바로 OAuth2 동의 화면으로 리다이렉트
              const queryString = new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'openid email profile',
                include_granted_scopes: 'true',
                prompt: 'consent',
                access_type: 'offline',
              });
              window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${queryString.toString()}`;
            } catch (e: any) {
              form.setError('root', {
                type: 'server',
                message: e?.message || 'Google 로그인 실패',
              });
            } finally {
              // 리다이렉트가 일어나지 않는 경우에만 로딩 해제
              setGoogleLoading(false);
            }
          }}
        >
          <span className="flex items-center justify-center gap-2">
            {/* 공식 로고 파일 사용 */}
            <Image
              src="/logos/google.svg"
              alt="Google"
              width={20}
              height={20}
              className="shrink-0"
            />
            <span>{googleLoading ? 'Google로 로그인 중...' : 'Google로 로그인'}</span>
          </span>
        </Button>

        {/* Apple 로그인 버튼 */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full h-11"
          onClick={async () => {
            try {
              const AppleID = (window as any).AppleID;
              if (!AppleID?.auth) throw new Error('Apple JS SDK 로드 실패');
              const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
              if (!appleClientId)
                throw new Error('환경변수 NEXT_PUBLIC_APPLE_CLIENT_ID 가 설정되지 않았습니다');

              AppleID.auth.init({
                clientId: appleClientId,
                scope: 'name email',
                redirectURI:
                  typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
                usePopup: true,
              });

              const res = await AppleID.auth.signIn();
              const idToken = res?.authorization?.id_token;
              if (!idToken) throw new Error('Apple ID Token을 받지 못했습니다');
              await oauth2Login('APPLE', idToken);
              router.replace('/');
            } catch (e: any) {
              form.setError('root', { type: 'server', message: e?.message || 'Apple 로그인 실패' });
            }
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Image src="/logos/apple.svg" alt="Apple" width={18} height={18} className="shrink-0" />
            <span>Apple로 로그인</span>
          </span>
        </Button>
      </div>
    </div>
  );
}
