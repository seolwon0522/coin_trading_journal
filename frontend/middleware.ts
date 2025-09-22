import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 공개 경로 (인증 불필요)
  const publicPaths = [
    '/login',
    '/register',
    '/api/auth',
    '/',
    '/demo',
    '/examples'
  ];

  // 정적 파일 및 Next.js 시스템 경로는 미들웨어 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('.') // 파일 확장자가 있는 경로 (이미지, CSS 등)
  ) {
    return NextResponse.next();
  }

  // 공개 경로는 그대로 통과
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Note: 클라이언트 사이드 인증은 AuthProvider에서 처리
  // 서버 사이드 미들웨어는 최소한으로 유지
  return NextResponse.next();
}

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: [
    // API 라우트 보호 (auth 제외)
    '/api/:path*',
    // 페이지 보호 (public paths 제외)
    '/trades/:path*',
    '/statistics/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/portfolio/:path*',
    '/trading/:path*',
    '/settings/:path*',
    '/reports/:path*'
  ],
};
