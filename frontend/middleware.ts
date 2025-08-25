import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // 추가 미들웨어 로직이 필요한 경우 여기에 작성
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // /login 페이지는 인증 없이 접근 가능
        if (req.nextUrl.pathname.startsWith('/login')) {
          return true;
        }
        // /api/auth는 인증 없이 접근 가능
        if (req.nextUrl.pathname.startsWith('/api/auth')) {
          return true;
        }
        // 나머지 페이지는 토큰이 있어야 접근 가능
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: [
    // API 라우트 보호 (auth 제외)
    '/api/:path*',
    // 페이지 보호 (login 제외)
    '/trades/:path*',
    '/statistics/:path*',
    '/dashboard/:path*',
  ],
};