'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  BarChart3,
  Settings,
  ChevronRight,
  Code2,
  Shield,
  Bot,
  Wallet,
  CandlestickChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTrades } from '@/hooks/use-trades';
import { useAuth } from '@/components/providers/auth-provider';

// 사이드바 메뉴 아이템 타입
interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  dynamicBadge?: 'trades' | 'openPositions'; // 동적 뱃지 타입
  adminOnly?: boolean; // 관리자 전용 메뉴
}

// 사이드바 컴포넌트
export function Sidebar() {
  const pathname = usePathname();
  const { trades, totalElements } = useTrades();
  const { user } = useAuth();

  // 동적 데이터 계산
  const totalTrades = totalElements || 0;
  const openPositions = 0; // TODO: 실제 오픈 포지션 계산 로직 추가

  // 사이드바 메뉴 데이터 (동적 데이터 포함)
  const sidebarItems: SidebarItem[] = [
    {
      title: '대시보드',
      href: '/',
      icon: LayoutDashboard,
      badge: openPositions > 0 ? openPositions : undefined, // 진행 중인 포지션 수
    },
    {
      title: '포트폴리오',
      href: '/portfolio',
      icon: Wallet,
    },
    {
      title: '트레이딩',
      href: '/trading',
      icon: CandlestickChart,
      badge: 'LIVE',
    },
    {
      title: '매매기록',
      href: '/trades',
      icon: TrendingUp,
      badge: totalTrades > 0 ? totalTrades : undefined, // 총 거래 수
    },
    {
      title: '리포트',
      href: '/reports',
      icon: FileText,
    },
    {
      title: '통계',
      href: '/statistics',
      icon: BarChart3,
    },
    {
      title: '컴포넌트 예제',
      href: '/examples',
      icon: Code2,
    },
    {
      title: '설정',
      href: '/settings',
      icon: Settings,
    },
    {
      title: 'ML 모니터링',
      href: '/admin/ml-monitoring',
      icon: Shield,
      adminOnly: true,
    },
    {
      title: '자동매매 관리',
      href: '/admin/auto-trading',
      icon: Bot,
      adminOnly: true,
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-background border-r">
      {/* 사이드바 헤더 */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
          CT
        </div>
        <span className="font-semibold">코인 트레이딩 저널</span>
      </div>

      {/* 메뉴 영역 */}
      <nav className="flex-1 overflow-y-auto py-6">
        <div className="space-y-1 px-3">
          {sidebarItems.map((item) => {
            // 한글 주석: 관리자 전용 메뉴 필터링
            if (item.adminOnly && user?.role !== 'ADMIN') {
              return null;
            }

            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-11 px-3',
                    isActive && 'bg-secondary text-secondary-foreground shadow-sm'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.title}</span>

                  {/* 뱃지 표시 */}
                  {item.badge && (
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        typeof item.badge === 'number' || !isNaN(Number(item.badge))
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* 활성 상태 화살표 */}
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* 하단 섹션 (추가 메뉴나 정보) */}
        <div className="mt-auto pt-6 px-3">
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="text-sm font-medium mb-2">💡 도움말</h4>
            <p className="text-xs text-muted-foreground mb-3">
              매매 기록을 체계적으로 관리하여 투자 성과를 개선하세요.
            </p>
            <Button variant="outline" size="sm" className="w-full">
              가이드 보기
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
