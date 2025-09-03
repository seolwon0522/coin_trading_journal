'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

// 사이드바와 헤더를 숨길 경로들
const FULLSCREEN_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
];

// 메인 레이아웃 컴포넌트 (Header + Sidebar + Content)
export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  
  // 현재 경로가 풀스크린 경로인지 확인
  const isFullscreenRoute = FULLSCREEN_ROUTES.includes(pathname);

  // 풀스크린 경로일 경우 사이드바와 헤더 없이 렌더링
  if (isFullscreenRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  // 일반 경로일 경우 사이드바와 헤더와 함께 렌더링
  return (
    <div className="flex h-screen bg-background">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <Sidebar />
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* 헤더 */}
        <Header />

        {/* 콘텐츠 영역 */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
