'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  BarChart3,
  Shield,
  Zap,
  Brain,
  Target,
  ArrowRight,
  ChevronRight,
  Activity,
  DollarSign,
  LineChart,
  Lock,
  Sparkles,
  Bot,
  BookOpen,
  Users,
  Trophy,
  PieChart,
  AlertCircle,
  CheckCircle,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

// 실시간 가격 티커 컴포넌트
function LivePriceTicker() {
  const [prices, setPrices] = useState<{ symbol: string; price: string; change: number }[]>([
    { symbol: 'BTCUSDT', price: '43,521.30', change: 2.3 },
    { symbol: 'ETHUSDT', price: '2,284.50', change: -0.8 },
    { symbol: 'BNBUSDT', price: '312.40', change: 1.2 },
    { symbol: 'SOLUSDT', price: '98.75', change: 5.4 },
    { symbol: 'XRPUSDT', price: '0.6234', change: -1.1 },
  ]);

  // 실시간 가격 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => prev.map(item => ({
        ...item,
        price: (parseFloat(item.price.replace(',', '')) * (1 + (Math.random() - 0.5) * 0.002))
          .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        change: item.change + (Math.random() - 0.5) * 0.5,
      })));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-background via-background/95 to-background py-2 overflow-hidden">
      <div className="flex animate-scroll-left">
        {[...prices, ...prices].map((item, index) => (
          <div key={`${item.symbol}-${index}`} className="flex items-center px-6 whitespace-nowrap">
            <span className="font-semibold text-sm">{item.symbol.replace('USDT', '')}</span>
            <span className="ml-2 text-sm">${item.price}</span>
            <span className={`ml-2 text-xs ${item.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {item.change > 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 기능 카드 컴포넌트
function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Card className="p-6 hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
      <div className="relative z-10">
        <div className={`h-12 w-12 rounded-lg ${gradient} p-2.5 mb-4`}>
          <Icon className="h-full w-full text-white" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

// 통계 카운터 컴포넌트
function StatsCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2초
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="text-center">
      <div className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
        {count.toLocaleString()}{suffix}
      </div>
      <p className="text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

// 후기 카드 컴포넌트
function TestimonialCard({ name, role, content, rating }: {
  name: string;
  role: string;
  content: string;
  rating: number;
}) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
          />
        ))}
      </div>
      <p className="text-sm mb-4 italic">"{content}"</p>
      <div className="flex items-center">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold">
          {name[0]}
        </div>
        <div className="ml-3">
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </Card>
  );
}

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 로그인된 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* 실시간 가격 티커 */}
      <LivePriceTicker />

      {/* 히어로 섹션 */}
      <section className="relative px-6 py-20 lg:py-32 overflow-hidden">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10 -z-10" />
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6">
            {/* 배지 */}
            <div className={`inline-flex items-center gap-2 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <Badge variant="secondary" className="px-4 py-1.5">
                <Sparkles className="h-3 w-3 mr-1" />
                AI 기반 트레이딩 분석
              </Badge>
              <Badge variant="outline" className="px-4 py-1.5">
                <Activity className="h-3 w-3 mr-1 text-green-500" />
                실시간 Binance 연동
              </Badge>
            </div>

            {/* 메인 헤드라인 */}
            <h1 className={`text-5xl lg:text-7xl font-bold transition-all duration-1000 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                암호화폐 트레이딩의
              </span>
              <br />
              <span className="text-foreground">
                새로운 패러다임
              </span>
            </h1>

            {/* 서브 헤드라인 */}
            <p className={`text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              AI가 분석하고, 자동으로 매매하며, 실시간으로 피드백을 제공하는
              <br />
              <span className="text-foreground font-semibold">차세대 트레이딩 저널 플랫폼</span>
            </p>

            {/* CTA 버튼들 */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center pt-8 transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <Link href="/register">
                <Button size="lg" className="group px-8">
                  무료로 시작하기
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline" className="px-8">
                  <Activity className="mr-2 h-4 w-4" />
                  라이브 데모 보기
                </Button>
              </Link>
            </div>

            {/* 신뢰 지표 */}
            <div className={`flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground transition-all duration-1000 delay-400 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>은행급 보안</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>10,000+ 트레이더</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>평균 수익률 32%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 플로팅 차트 애니메이션 */}
        <div className="absolute top-20 left-10 animate-float">
          <LineChart className="h-12 w-12 text-primary/20" />
        </div>
        <div className="absolute bottom-20 right-10 animate-float-delayed">
          <PieChart className="h-16 w-16 text-purple-600/20" />
        </div>
        <div className="absolute top-40 right-20 animate-float">
          <BarChart3 className="h-10 w-10 text-pink-600/20" />
        </div>
      </section>

      {/* 핵심 기능 섹션 */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              핵심 기능
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              트레이딩 성공을 위한 <span className="text-primary">올인원 솔루션</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              데이터 수집부터 자동매매, AI 분석까지 모든 것을 한 곳에서
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="AI 매매 분석"
              description="머신러닝이 당신의 매매 패턴을 학습하고 개선점을 실시간으로 제안합니다"
              gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={Bot}
              title="자동매매 봇"
              description="검증된 전략으로 24/7 자동매매를 실행하고 리스크를 자동으로 관리합니다"
              gradient="bg-gradient-to-br from-purple-500 to-pink-500"
            />
            <FeatureCard
              icon={Shield}
              title="리스크 관리"
              description="실시간 손절/익절 알림과 포지션 사이즈 계산으로 자산을 보호합니다"
              gradient="bg-gradient-to-br from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={LineChart}
              title="백테스팅 엔진"
              description="과거 데이터로 전략을 검증하고 최적의 매매 타이밍을 찾아냅니다"
              gradient="bg-gradient-to-br from-orange-500 to-red-500"
            />
            <FeatureCard
              icon={Activity}
              title="실시간 모니터링"
              description="Binance와 실시간 연동으로 시장 변화를 즉시 포착하고 대응합니다"
              gradient="bg-gradient-to-br from-indigo-500 to-purple-500"
            />
            <FeatureCard
              icon={BookOpen}
              title="트레이딩 저널"
              description="모든 거래를 자동으로 기록하고 성과를 체계적으로 분석합니다"
              gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
            />
          </div>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Trophy className="h-3 w-3 mr-1" />
              플랫폼 성과
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              숫자로 보는 <span className="text-primary">성공 스토리</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <StatsCounter value={10234} label="활성 트레이더" suffix="+" />
            <StatsCounter value={2847} label="일일 거래량" suffix="M" />
            <StatsCounter value={32} label="평균 수익률" suffix="%" />
            <StatsCounter value={99} label="시스템 가동률" suffix="%" />
          </div>
        </div>
      </section>

      {/* 비교 섹션 */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <CheckCircle className="h-3 w-3 mr-1" />
              왜 우리인가?
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              기존 방식 vs <span className="text-primary">CryptoTradeManager</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 기존 방식 */}
            <Card className="p-8 relative">
              <div className="absolute -top-3 left-6">
                <Badge variant="secondary">기존 방식</Badge>
              </div>
              <div className="space-y-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">수동 기록</p>
                    <p className="text-sm text-muted-foreground">엑셀이나 노트에 일일이 기록</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">감정적 매매</p>
                    <p className="text-sm text-muted-foreground">FOMO와 공포에 휘둘리는 결정</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">제한된 분석</p>
                    <p className="text-sm text-muted-foreground">단순 차트 분석에만 의존</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">놓친 기회</p>
                    <p className="text-sm text-muted-foreground">24시간 모니터링 불가능</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 우리 플랫폼 */}
            <Card className="p-8 relative border-primary">
              <div className="absolute -top-3 left-6">
                <Badge>CryptoTradeManager</Badge>
              </div>
              <div className="space-y-4 mt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">자동 동기화</p>
                    <p className="text-sm text-muted-foreground">Binance와 실시간 연동</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">AI 기반 결정</p>
                    <p className="text-sm text-muted-foreground">데이터 기반 객관적 매매</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">심층 분석</p>
                    <p className="text-sm text-muted-foreground">ML 모델로 패턴 발견</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">24/7 자동매매</p>
                    <p className="text-sm text-muted-foreground">기회를 놓치지 않는 봇</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 사용자 후기 섹션 */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Star className="h-3 w-3 mr-1" />
              사용자 후기
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              성공한 트레이더들의 <span className="text-primary">리얼 스토리</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              name="임요셉"
              role="2년차 트레이더"
              content="AI가 제 매매 패턴을 분석해서 개선점을 제시해주니 수익률이 2배로 늘었습니다. 이제는 없어서는 안 될 필수 도구가 되었어요."
              rating={5}
            />
            <TestimonialCard
              name="김영환"
              role="개인 투자자"
              content="백테스팅으로 전략을 미리 검증할 수 있어서 큰 손실을 피할 수 있었습니다. 리스크 관리 기능도 정말 유용하고 신뢰할 만해요."
              rating={5}
            />
            <TestimonialCard
              name="최인혁"
              role="전업 트레이더"
              content="24시간 모니터링하던 부담에서 벗어났습니다. 자동매매 봇이 대신 일해주고, 중요한 타이밍에만 알림을 받아서 훨씬 효율적이에요."
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-12 bg-gradient-to-br from-primary/10 via-purple-600/10 to-pink-600/10 border-0">
            <h2 className="text-4xl font-bold mb-4">
              지금 시작하고 <span className="text-primary">트레이딩 실력</span>을 업그레이드하세요
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              무료로 시작하고, 언제든 업그레이드할 수 있습니다
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="px-8">
                  지금 무료로 시작하기
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="px-8">
                  로그인
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              <Lock className="inline h-3 w-3 mr-1" />
              신용카드 불필요 • 언제든 취소 가능
            </p>
          </Card>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">CryptoTradeManager</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 CryptoTradeManager. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}