'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { TradingHeader } from './trading-header';

interface MainLayoutProps {
  children: React.ReactNode;
}

// 로그인/회원가입 등 헤더가 필요없는 경로들
const NO_HEADER_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
];

// 메인 레이아웃 컴포넌트 (Trading 스타일로 통일)
export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  // 헤더가 필요없는 경로 체크
  const hideHeader = NO_HEADER_ROUTES.includes(pathname);

  // 랜딩페이지는 특별 처리
  if (pathname === '/') {
    return (
      <div className="min-h-screen bg-[#0d0d0d]">
        {children}
      </div>
    );
  }

  // 헤더가 필요없는 경로
  if (hideHeader) {
    return (
      <div className="min-h-screen bg-[#0d0d0d]">
        {children}
      </div>
    );
  }

  // 모든 일반 페이지는 TradingHeader와 함께 렌더링
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <TradingHeader />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
