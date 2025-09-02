import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';

// 토큰 갱신 함수
async function refreshAccessToken(token: JWT) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.refreshToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error('Token refresh failed');
    }

    return {
      ...token,
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      accessTokenExpires: Date.now() + (data.data.expiresIn * 1000)
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    };
  }
}

// NextAuth 옵션 설정
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요');
        }

        try {
          // 백엔드 로그인 API 호출
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.message || '로그인에 실패했습니다');
          }

          // 로그인 성공 시 사용자 정보와 토큰 반환
          return {
            id: data.data.user.id.toString(),
            email: data.data.user.email,
            name: data.data.user.name,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            expiresIn: data.data.expiresIn
          };
        } catch (error) {
          console.error('Login error:', error);
          throw new Error('로그인 처리 중 오류가 발생했습니다');
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 최초 로그인 시 토큰에 사용자 정보 저장
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        token.accessTokenExpires = Date.now() + ((user as any).expiresIn * 1000);
      }

      // 토큰 만료 확인 및 갱신
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // 토큰 갱신 로직
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      // 세션에 토큰 정보 포함
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
        };
        session.accessToken = token.accessToken as string;
        session.error = token.error as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  secret: process.env.NEXTAUTH_SECRET,
};