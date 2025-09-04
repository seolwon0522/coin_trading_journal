'use client';

import { useState, useEffect } from 'react';
import { Heart, Coffee, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QuickSponsorModal } from './quick-sponsor-modal';

interface SponsorBannerProps {
  className?: string;
}

// 후원 정보 (실제 정보로 변경 필요)
const PAYMENT_INFO = {
  kakao: {
    qr: 'https://qr.kakaopay.com/YOUR_CODE', // 실제 카카오페이 QR 코드로 변경
    link: 'https://link.kakaopay.com/_/YOUR_CODE', // 카카오페이 송금 링크
  },
  bank: {
    bank: '토스뱅크',
    account: '1000-0000-0000', // 실제 계좌번호로 변경
    holder: '홍길동', // 실제 예금주명으로 변경
  },
};

export function SponsorBanner({ className }: SponsorBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [sponsorCount, setSponsorCount] = useState(234);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 2초 후 부드럽게 나타나기
    setTimeout(() => setIsVisible(true), 2000);

    // 후원자 수 애니메이션
    const interval = setInterval(() => {
      setSponsorCount(prev => prev + Math.floor(Math.random() * 3));
    }, 30000); // 30초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 카카오페이 송금 링크 열기
  const handleKakaoPayment = () => {
    window.open(PAYMENT_INFO.kakao.link, '_blank');
  };

  // 계좌번호 복사
  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_INFO.bank.account);
      alert('계좌번호가 복사되었습니다!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "relative bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-orange-600/10 border-b",
      "transition-all duration-1000 ease-out",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
      className
    )}>
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-orange-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* 왼쪽: 메시지 */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Heart className="h-5 w-5 text-red-500 animate-pulse" />
                <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <span className="font-semibold text-sm hidden sm:inline">
                개발자 응원하기
              </span>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary font-semibold">{sponsorCount}명</span>
              <span>이 후원했어요</span>
              <Coffee className="h-4 w-4 text-brown-600" />
            </div>
          </div>

          {/* 중앙: 금액 버튼들 */}
          <div className="flex items-center gap-2">
            {/* 빠른 후원 안내 */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Coffee className="h-4 w-4 text-brown-600" />
              <span>커피 한 잔의 후원이 큰 힘이 됩니다</span>
            </div>

            {/* 메인 후원 버튼 */}
            <Button
              size="sm"
              className="h-8 px-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 group animate-pulse-glow"
              onClick={() => setIsModalOpen(true)}
            >
              <span className="text-base mr-1">💛</span>
              <span className="hidden sm:inline">카카오페이 후원</span>
              <span className="sm:hidden">후원</span>
              <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>

            {/* 계좌 정보 버튼 */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 hidden sm:flex"
              onClick={handleCopyAccount}
            >
              <span className="text-xs">계좌 복사</span>
            </Button>
          </div>

        </div>

        {/* 모바일에서 추가 정보 */}
        <div className="flex sm:hidden items-center justify-center gap-2 mt-2 pt-2 border-t border-white/10">
          <span className="text-xs text-muted-foreground">
            ☕ 개발자를 응원해주세요
          </span>
        </div>
      </div>

      {/* 프로그레스 바 (후원 목표) */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-1000"
          style={{ width: `${Math.min((sponsorCount / 500) * 100, 100)}%` }}
        />
      </div>

      {/* 후원 모달 */}
      <QuickSponsorModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}