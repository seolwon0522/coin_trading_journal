'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  LayoutDashboard,
  Wallet,
  FileText,
  Settings,
  User,
  LogOut,
  Bell,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/components/providers/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface TradingHeaderProps {
  currentSymbol?: string;
}

export function TradingHeader({ currentSymbol = 'BTCUSDT' }: TradingHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // 컴팩트 네비게이션 메뉴
  const navItems = [
    { title: '거래', href: `/trading/${currentSymbol}`, active: pathname.startsWith('/trading') },
    { title: '포트폴리오', href: '/portfolio', active: pathname === '/portfolio' },
    { title: '거래내역', href: '/trades', active: pathname === '/trades' },
    { title: '통계', href: '/statistics', active: pathname === '/statistics' },
  ];

  return (
    <header className="h-12 bg-[#161a1e] border-b border-gray-800 flex items-center justify-between px-4">
      {/* 왼쪽: 로고 및 네비게이션 */}
      <div className="flex items-center gap-6">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
            CT
          </div>
          <span className="font-semibold text-sm text-gray-200 hidden sm:block">
            Crypto Trading
          </span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-3 text-xs font-medium transition-colors',
                  item.active
                    ? 'text-white bg-gray-800'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                )}
              >
                {item.title}
              </Button>
            </Link>
          ))}
        </nav>

        {/* 모바일 메뉴 */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4 text-gray-400" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-[#161a1e] border-gray-800">
            <SheetHeader>
              <SheetTitle className="text-white">메뉴</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-10 px-3',
                      item.active
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    )}
                  >
                    {item.title}
                  </Button>
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-800">
                <Link href="/">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-10 px-3 text-gray-400 hover:text-white hover:bg-gray-800/50"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    대시보드
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-10 px-3 text-gray-400 hover:text-white hover:bg-gray-800/50"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    설정
                  </Button>
                </Link>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* 오른쪽: 사용자 정보 및 액션 */}
      <div className="flex items-center gap-2">
        {/* 잔고 요약 (데스크톱만) */}
        {user && (
          <div className="hidden lg:flex items-center gap-4 mr-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">총 자산:</span>
              <span className="text-white font-medium">$12,345.67</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">일일 손익:</span>
              <span className="text-emerald-400 font-medium">+2.45%</span>
            </div>
          </div>
        )}

        {/* 알림 */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4 text-gray-400" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center">
            3
          </span>
        </Button>

        {/* 테마 토글 */}
        <ThemeToggle />

        {/* 사용자 메뉴 */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
                <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-300" />
                </div>
                <span className="text-xs text-gray-300 hidden sm:block">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/portfolio" className="cursor-pointer">
                  <Wallet className="h-3 w-3 mr-2" />
                  포트폴리오
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/trades" className="cursor-pointer">
                  <FileText className="h-3 w-3 mr-2" />
                  거래내역
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-3 w-3 mr-2" />
                  설정
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                <LogOut className="h-3 w-3 mr-2" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button size="sm" className="h-8 text-xs">
              로그인
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}