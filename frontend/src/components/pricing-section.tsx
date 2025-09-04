'use client';

import { useState } from 'react';
import { Check, X, Sparkles, Zap, Crown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type BillingPeriod = 'monthly' | 'yearly';

const pricingPlans = [
  {
    id: 'free',
    name: '무료',
    icon: Sparkles,
    description: '암호화폐 트레이딩을 시작하는 초보자를 위한 플랜',
    price: {
      monthly: 0,
      yearly: 0,
    },
    badge: null,
    features: [
      { name: '월 50건 거래 기록', included: true },
      { name: '기본 대시보드', included: true },
      { name: '수익률 분석', included: true },
      { name: '1개 거래소 연동', included: true },
      { name: '기본 차트 분석', included: true },
      { name: 'AI 매매 분석', included: false },
      { name: '자동매매 봇', included: false },
      { name: '백테스팅', included: false },
      { name: '실시간 알림', included: false },
      { name: '우선 지원', included: false },
    ],
    cta: '무료로 시작',
    highlighted: false,
  },
  {
    id: 'starter',
    name: '스타터',
    icon: Zap,
    description: '개인 트레이더를 위한 필수 기능 패키지',
    price: {
      monthly: 29000,
      yearly: 290000,
    },
    badge: null,
    features: [
      { name: '월 500건 거래 기록', included: true },
      { name: '고급 대시보드', included: true },
      { name: '상세 수익률 분석', included: true },
      { name: '3개 거래소 연동', included: true },
      { name: '고급 차트 분석', included: true },
      { name: 'AI 매매 분석 (기본)', included: true },
      { name: '자동매매 봇 1개', included: true },
      { name: '백테스팅 (월 10회)', included: true },
      { name: '실시간 알림', included: true },
      { name: '이메일 지원', included: true },
    ],
    cta: '시작하기',
    highlighted: false,
  },
  {
    id: 'pro',
    name: '프로',
    icon: Crown,
    description: '전문 트레이더를 위한 올인원 솔루션',
    price: {
      monthly: 79000,
      yearly: 790000,
    },
    badge: '인기',
    badgeColor: 'bg-gradient-to-r from-purple-600 to-pink-600',
    features: [
      { name: '무제한 거래 기록', included: true },
      { name: '프리미엄 대시보드', included: true },
      { name: 'AI 기반 심층 분석', included: true },
      { name: '무제한 거래소 연동', included: true },
      { name: 'TradingView 통합', included: true },
      { name: 'AI 매매 분석 (고급)', included: true },
      { name: '자동매매 봇 5개', included: true },
      { name: '백테스팅 (무제한)', included: true },
      { name: '실시간 알림 + SMS', included: true },
      { name: '24/7 우선 지원', included: true },
    ],
    cta: '프로 시작하기',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: '엔터프라이즈',
    icon: Building2,
    description: '팀과 기관을 위한 맞춤형 솔루션',
    price: {
      monthly: -1, // 문의
      yearly: -1,
    },
    badge: '맞춤형',
    badgeColor: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    features: [
      { name: '모든 프로 기능 포함', included: true },
      { name: '무제한 팀 멤버', included: true },
      { name: '전용 서버 인프라', included: true },
      { name: 'API 우선순위 액세스', included: true },
      { name: '맞춤형 AI 모델', included: true },
      { name: '무제한 자동매매 봇', included: true },
      { name: '화이트 라벨 옵션', included: true },
      { name: '컴플라이언스 지원', included: true },
      { name: '전담 매니저', included: true },
      { name: 'SLA 보장', included: true },
    ],
    cta: '문의하기',
    highlighted: false,
  },
];

export function PricingSection({ className = '' }: { className?: string }) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const formatPrice = (price: number) => {
    if (price === -1) return '문의';
    if (price === 0) return '무료';
    return `₩${price.toLocaleString()}`;
  };

  const calculateSavings = (monthly: number, yearly: number) => {
    if (monthly <= 0 || yearly <= 0) return 0;
    const yearlyMonthly = yearly / 12;
    const savings = Math.round(((monthly - yearlyMonthly) / monthly) * 100);
    return savings;
  };

  return (
    <section className={cn("py-20 px-6", className)}>
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            요금제
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            당신의 트레이딩 레벨에 맞는 <span className="text-primary">완벽한 플랜</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            무료로 시작하고, 성장에 따라 업그레이드하세요
          </p>

          {/* 빌링 주기 선택 */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={cn(
              "text-sm font-medium transition-colors",
              billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              월간 결제
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors hover:bg-muted/80 data-[state=checked]:bg-primary"
              data-state={billingPeriod === 'yearly' ? 'checked' : 'unchecked'}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
            <span className={cn(
              "text-sm font-medium transition-colors flex items-center gap-2",
              billingPeriod === 'yearly' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              연간 결제
              <Badge variant="secondary" className="text-xs">
                2개월 무료
              </Badge>
            </span>
          </div>
        </div>

        {/* 요금제 카드들 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;
            const price = billingPeriod === 'monthly' ? plan.price.monthly : plan.price.yearly;
            const savings = calculateSavings(plan.price.monthly, plan.price.yearly / 12);
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative p-6 transition-all duration-300 hover:shadow-xl",
                  plan.highlighted && "border-primary shadow-lg scale-105 hover:scale-110"
                )}
              >
                {/* 배지 */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={cn("px-3 py-1", plan.badgeColor)}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  {/* 아이콘과 이름 */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        plan.highlighted 
                          ? "bg-gradient-to-br from-primary/20 to-purple-600/20" 
                          : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          plan.highlighted ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  {/* 가격 */}
                  <div className="py-4 border-y">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {formatPrice(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-muted-foreground text-sm">
                          /{billingPeriod === 'monthly' ? '월' : '년'}
                        </span>
                      )}
                    </div>
                    {billingPeriod === 'yearly' && savings > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        연간 {savings}% 할인
                      </p>
                    )}
                  </div>

                  {/* 기능 목록 */}
                  <ul className="space-y-3">
                    {plan.features.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={cn(
                          "text-sm",
                          !feature.included && "text-muted-foreground/50"
                        )}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* 더 많은 기능 표시 */}
                  {plan.features.length > 5 && (
                    <details className="group">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        +{plan.features.length - 5}개 더보기
                      </summary>
                      <ul className="space-y-3 mt-3">
                        {plan.features.slice(5).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            {feature.included ? (
                              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                            )}
                            <span className={cn(
                              "text-sm",
                              !feature.included && "text-muted-foreground/50"
                            )}>
                              {feature.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* CTA 버튼 */}
                  <Link href={plan.id === 'enterprise' ? '/contact' : '/register'}>
                    <Button 
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 추가 정보 */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            모든 플랜은 7일 무료 체험이 가능합니다. 신용카드 없이 시작하세요.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>언제든 취소 가능</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>100% 환불 보장</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>안전한 결제</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}