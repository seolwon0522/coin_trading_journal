'use client';

import { useState } from 'react';
import { QrCode, Copy, Check, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

// 후원 정보 (실제 정보로 변경 필요)
const SPONSOR_INFO = {
  kakaopay: {
    link: 'https://qr.kakaopay.com/YOUR_CODE', // 카카오페이 송금 링크
    phone: '010-1234-5678', // 카카오페이 송금 번호
  },
  naverpay: {
    id: 'YOUR_NAVERPAY_ID', // 네이버페이 아이디
    link: 'https://m.pay.naver.com/o/home', // 네이버페이 링크
  },
  bank: {
    name: '토스뱅크',
    account: '1000-0000-0000',
    holder: '홍길동',
  },
  payco: {
    link: 'https://www.payco.com', // 페이코 링크
  },
};

interface QuickSponsorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickSponsorModal({ open, onOpenChange }: QuickSponsorModalProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  const handleKakaoPayment = () => {
    window.open(SPONSOR_INFO.kakaopay.link, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            개발자 후원하기
          </DialogTitle>
          <DialogDescription>
            편하신 방법으로 후원해주세요 💝
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="kakao" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kakao">카카오페이</TabsTrigger>
            <TabsTrigger value="naverpay">네이버페이</TabsTrigger>
            <TabsTrigger value="bank">계좌이체</TabsTrigger>
          </TabsList>

          <TabsContent value="kakao" className="space-y-4">
            <div className="space-y-3">
              <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💛</span>
                    <span className="font-semibold">카카오페이 송금</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    카카오페이 송금 번호
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="font-mono text-lg">{SPONSOR_INFO.kakaopay.phone}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(SPONSOR_INFO.kakaopay.phone, 'kakao-phone')}
                    >
                      {copiedText === 'kakao-phone' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleKakaoPayment()}
                >
                  ☕ 3천원
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleKakaoPayment()}
                >
                  🍰 5천원
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleKakaoPayment()}
                >
                  🍔 1만원
                </Button>
              </div>

              <Button
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={() => handleKakaoPayment()}
              >
                카카오페이 송금 페이지 열기
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="naverpay" className="space-y-4">
            <div className="space-y-3">
              <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💚</span>
                    <span className="font-semibold">네이버페이 송금</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    네이버페이 아이디로 송금하세요
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="font-mono text-lg">{SPONSOR_INFO.naverpay.id}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(SPONSOR_INFO.naverpay.id, 'naverpay')}
                    >
                      {copiedText === 'naverpay' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => window.open(SPONSOR_INFO.naverpay.link, '_blank')}
              >
                네이버페이 송금 페이지 열기
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="space-y-4">
            <div className="space-y-3">
              <Card className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{SPONSOR_INFO.bank.name}</p>
                    <p className="text-sm text-muted-foreground">
                      예금주: {SPONSOR_INFO.bank.holder}
                    </p>
                    <p className="font-mono text-lg mt-1">
                      {SPONSOR_INFO.bank.account}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(SPONSOR_INFO.bank.account, 'bank')}
                  >
                    {copiedText === 'bank' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Card>

              <div className="text-center text-xs text-muted-foreground">
                계좌번호를 복사하여 이체해주세요
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">
            여러분의 후원이 더 나은 서비스를 만듭니다 💜
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}