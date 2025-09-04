'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Link2,
  BarChart3,
  Brain,
  Rocket,
  ArrowRight,
  PlayCircle,
  CheckCircle,
  ChartBar,
  Bot,
  FileText,
  Target,
  TrendingUp,
  Shield,
  Activity,
  DollarSign,
  Sparkles,
  Zap,
  Database,
  Lock,
  Globe,
  Timer,
  Users,
  Code,
  Cpu,
  Cloud,
  LineChart,
  PieChart,
  TrendingDown,
  AlertTriangle,
  Bell,
  Settings,
  Layers,
  GitBranch,
  Monitor,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 스크롤 애니메이션 훅
function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold, rootMargin: '50px' }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return { ref, isVisible };
}

const steps = [
  {
    number: '01',
    title: '거래소 연동',
    description: 'Binance, Upbit 등 주요 거래소와 API로 안전하게 연결합니다',
    icon: Link2,
    color: 'from-blue-500 to-cyan-500',
    features: [
      '읽기 전용 API로 안전한 연동',
      '실시간 거래 데이터 자동 수집',
      '과거 거래 내역 일괄 가져오기',
    ],
  },
  {
    number: '02',
    title: '자동 분석',
    description: 'AI가 모든 거래를 실시간으로 분석하고 패턴을 파악합니다',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    features: [
      '매매 타이밍 분석',
      '손익 패턴 인식',
      '리스크 평가 및 경고',
    ],
  },
  {
    number: '03',
    title: '인사이트 제공',
    description: '개인화된 피드백과 개선 방향을 제시합니다',
    icon: ChartBar,
    color: 'from-green-500 to-emerald-500',
    features: [
      '실시간 대시보드',
      'AI 코칭 및 조언',
      '맞춤형 전략 추천',
    ],
  },
  {
    number: '04',
    title: '자동 매매',
    description: '검증된 전략으로 24/7 자동매매를 실행합니다',
    icon: Bot,
    color: 'from-orange-500 to-red-500',
    features: [
      '백테스팅으로 검증',
      '리스크 관리 자동화',
      '실시간 성과 모니터링',
    ],
  },
];

const detailedFeatures = [
  {
    id: 'data-collection',
    category: '데이터 수집 & 연동',
    title: '모든 거래소를 하나로',
    subtitle: '실시간 데이터 수집부터 포트폴리오 관리까지',
    description: 'WebSocket을 통한 밀리초 단위의 실시간 데이터 수집과 10개 이상의 주요 거래소 통합으로 모든 자산을 한 곳에서 관리합니다. 최대 5년간의 과거 거래 데이터를 분석하여 당신의 매매 스타일을 완벽하게 이해합니다.',
    icon: Activity,
    image: '/images/data-collection.svg',
    gradient: 'from-blue-500 to-cyan-500',
    stats: [
      { label: '실시간 지연', value: '<50ms' },
      { label: '지원 거래소', value: '10+' },
      { label: '과거 데이터', value: '5년' },
    ],
    features: [
      {
        icon: Zap,
        title: '초고속 실시간 연동',
        description: 'WebSocket 연결로 밀리초 단위 데이터 수신',
      },
      {
        icon: Globe,
        title: '글로벌 거래소 통합',
        description: 'Binance, Coinbase, Upbit 등 주요 거래소 지원',
      },
      {
        icon: Database,
        title: '빅데이터 분석',
        description: '수십억 개의 거래 데이터를 실시간 처리',
      },
      {
        icon: Shield,
        title: '안전한 API 연동',
        description: '읽기 전용 API로 자산 이동 불가',
      },
    ],
  },
  {
    id: 'ai-engine',
    category: 'AI 분석 엔진',
    title: '딥러닝이 찾아내는 수익 패턴',
    subtitle: 'GPT-4 수준의 AI가 24시간 시장을 분석합니다',
    description: '최신 LSTM과 Transformer 모델을 활용한 가격 예측, 수백만 개의 뉴스와 소셜 미디어를 분석하는 감성 분석, 그리고 이상 거래 감지까지. 당신보다 시장을 더 잘 아는 AI가 24/7 일합니다.',
    icon: Brain,
    image: '/images/ai-analysis.svg',
    gradient: 'from-purple-500 to-pink-500',
    stats: [
      { label: '예측 정확도', value: '87%' },
      { label: '분석 지표', value: '200+' },
      { label: '학습 데이터', value: '10TB+' },
    ],
    features: [
      {
        icon: LineChart,
        title: '패턴 인식 & 예측',
        description: '과거 패턴을 학습하여 미래 가격 움직임 예측',
      },
      {
        icon: TrendingUp,
        title: '시장 심리 분석',
        description: '뉴스, SNS, 온체인 데이터로 시장 심리 파악',
      },
      {
        icon: AlertTriangle,
        title: '리스크 조기 경보',
        description: '급락 가능성을 미리 감지하고 알림',
      },
      {
        icon: Cpu,
        title: '개인화 학습',
        description: '당신의 매매 스타일을 학습하여 맞춤 전략 제공',
      },
    ],
  },
  {
    id: 'auto-trading',
    category: '자동매매 시스템',
    title: '잠자는 동안에도 수익을 창출',
    subtitle: '검증된 전략으로 24/7 자동매매를 실행합니다',
    description: '노코드 봇 빌더로 누구나 쉽게 자동매매 전략을 만들 수 있습니다. 100개 이상의 검증된 템플릿과 백테스팅으로 안전하게 시작하세요. DCA, 그리드, 차익거래 등 다양한 전략을 지원합니다.',
    icon: Bot,
    image: '/images/auto-trading.svg',
    gradient: 'from-orange-500 to-red-500',
    stats: [
      { label: '평균 수익률', value: '+32%' },
      { label: '전략 템플릿', value: '100+' },
      { label: '일일 거래량', value: '$2.8B' },
    ],
    features: [
      {
        icon: Code,
        title: '노코드 봇 빌더',
        description: '드래그 앤 드롭으로 전략 생성',
      },
      {
        icon: Target,
        title: '스마트 주문',
        description: '자동 손절/익절 및 트레일링 스톱',
      },
      {
        icon: GitBranch,
        title: '다중 전략 운영',
        description: '여러 봇을 동시에 운영하여 리스크 분산',
      },
      {
        icon: Timer,
        title: '백테스팅 엔진',
        description: '과거 데이터로 전략 성과 사전 검증',
      },
    ],
  },
  {
    id: 'reporting',
    category: '리포트 & 분석',
    title: '한눈에 보는 투자 성과',
    subtitle: '상세한 분석 리포트로 투자를 개선하세요',
    description: '일간, 주간, 월간 자동 리포트 생성으로 투자 성과를 체계적으로 관리합니다. 세금 계산, PnL 분석, 벤치마크 비교까지 모든 것을 자동화합니다.',
    icon: FileText,
    image: '/images/reporting.svg',
    gradient: 'from-green-500 to-emerald-500',
    stats: [
      { label: '리포트 종류', value: '20+' },
      { label: '세금 지원국', value: '15개국' },
      { label: '분석 깊이', value: '5년' },
    ],
    features: [
      {
        icon: PieChart,
        title: '포트폴리오 분석',
        description: '자산 배분과 리스크 분석',
      },
      {
        icon: DollarSign,
        title: '세금 자동 계산',
        description: '국가별 암호화폐 세금 자동 계산',
      },
      {
        icon: BarChart3,
        title: '벤치마크 비교',
        description: 'BTC, S&P500 대비 성과 측정',
      },
      {
        icon: Bell,
        title: '맞춤 알림',
        description: '중요 이벤트 실시간 알림',
      },
    ],
  },
  {
    id: 'mobile',
    category: '모바일 & 접근성',
    title: '언제 어디서나 관리',
    subtitle: 'iOS, Android 앱으로 이동 중에도 완벽한 제어',
    description: '네이티브 모바일 앱으로 언제 어디서나 포트폴리오를 관리하고 거래를 실행하세요. 푸시 알림으로 중요한 순간을 놓치지 마세요.',
    icon: Smartphone,
    image: '/images/mobile.svg',
    gradient: 'from-indigo-500 to-purple-500',
    stats: [
      { label: '앱 평점', value: '4.8★' },
      { label: '다운로드', value: '100K+' },
      { label: '지원 OS', value: 'iOS/Android' },
    ],
    features: [
      {
        icon: Monitor,
        title: '완벽한 동기화',
        description: '모든 기기에서 실시간 동기화',
      },
      {
        icon: Lock,
        title: '생체 인증',
        description: 'Face ID, 지문 인식 지원',
      },
      {
        icon: Sparkles,
        title: '다크 모드',
        description: '눈이 편한 다크 테마 지원',
      },
      {
        icon: Settings,
        title: '위젯 지원',
        description: '홈 화면에서 바로 확인',
      },
    ],
  },
];

export function HowItWorks({ className = '' }: { className?: string }) {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className={cn('py-20 px-6', className)}>
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <PlayCircle className="h-3 w-3 mr-1" />
            작동 원리
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            단 4단계로 시작하는 <span className="text-primary">스마트 트레이딩</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            복잡한 설정 없이 거래소를 연동하면 AI가 모든 것을 자동으로 처리합니다
          </p>
        </div>

        {/* 단계별 프로세스 */}
        <div className="grid lg:grid-cols-4 gap-6 mb-32">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className={cn(
                  "relative cursor-pointer transition-all duration-300",
                  activeStep === index && "scale-105"
                )}
                onClick={() => setActiveStep(index)}
              >
                <Card className={cn(
                  "p-6 h-full hover:shadow-xl transition-all",
                  activeStep === index && "border-primary shadow-lg"
                )}>
                  {/* 연결선 */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 z-10">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* 번호 */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      "text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                      step.color
                    )}>
                      {step.number}
                    </span>
                    <div className={cn(
                      "h-12 w-12 rounded-lg bg-gradient-to-br p-2.5",
                      step.color,
                      "bg-opacity-10"
                    )}>
                      <Icon className="h-full w-full text-white" />
                    </div>
                  </div>

                  {/* 제목과 설명 */}
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {step.description}
                  </p>

                  {/* 기능 목록 */}
                  <ul className="space-y-2">
                    {step.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            );
          })}
        </div>

        {/* 상세 기능 섹션 제목 */}
        <div className="text-center mb-20">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            핵심 기능 상세
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            더 자세한 기능을 <span className="text-primary">알아보세요</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            스크롤하면서 CryptoTradeManager의 강력한 기능들을 하나씩 살펴보세요
          </p>
        </div>

        {/* 상세 기능 - 스크롤 형식 */}
        <div className="space-y-32">
          {detailedFeatures.map((feature, index) => {
            const Icon = feature.icon;
            const isEven = index % 2 === 0;
            
            return (
              <FeatureSection
                key={feature.id}
                feature={feature}
                index={index}
                isEven={isEven}
              />
            );
          })}
        </div>

        {/* 보안 섹션 */}
        <Card className="mt-32 p-12 bg-gradient-to-br from-primary/5 via-purple-600/5 to-pink-600/5 border-primary/20">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="flex-1 text-center lg:text-left">
              <h3 className="text-3xl font-bold mb-4">
                은행급 보안으로 <span className="text-primary">완벽하게 보호</span>됩니다
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                모든 데이터는 256비트 AES 암호화로 보호되며, 읽기 전용 API만 사용하여
                자산을 직접 이동할 수 없습니다. ISO 27001 인증을 받은 AWS 인프라에서 
                99.99% 가동률로 안정적으로 운영됩니다.
              </p>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">2FA 인증</p>
                    <p className="text-sm text-muted-foreground">이중 보안</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">읽기 전용</p>
                    <p className="text-sm text-muted-foreground">출금 불가</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">SSL/TLS</p>
                    <p className="text-sm text-muted-foreground">암호화 통신</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* CTA */}
        <div className="text-center mt-20">
          <Button size="lg" className="px-12 text-lg h-14">
            지금 무료로 시작하기
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-muted-foreground mt-4">
            신용카드 없이 7일 무료 체험 • 언제든 취소 가능
          </p>
        </div>
      </div>
    </section>
  );
}

// 상세 기능 섹션 컴포넌트
function FeatureSection({ feature, index, isEven }: {
  feature: typeof detailedFeatures[0];
  index: number;
  isEven: boolean;
}) {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const Icon = feature.icon;

  return (
    <div ref={ref} className={cn(
      "relative transition-all duration-1000",
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    )}>
      <div className={cn(
        "flex flex-col gap-12",
        isEven ? "lg:flex-row" : "lg:flex-row-reverse"
      )}>
        {/* 콘텐츠 */}
        <div className="flex-1 space-y-6">
          {/* 카테고리 배지 */}
          <div className="inline-flex items-center gap-2">
            <Badge variant="outline">
              <Icon className="h-3 w-3 mr-1" />
              {feature.category}
            </Badge>
            <Badge variant="secondary">
              #{String(index + 1).padStart(2, '0')}
            </Badge>
          </div>

          {/* 제목 */}
          <div>
            <h3 className="text-3xl lg:text-4xl font-bold mb-3">
              {feature.title}
            </h3>
            <p className="text-xl text-primary font-semibold">
              {feature.subtitle}
            </p>
          </div>

          {/* 설명 */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            {feature.description}
          </p>

          {/* 통계 */}
          <div className="grid grid-cols-3 gap-4">
            {feature.stats.map((stat, idx) => (
              <Card key={idx} className="p-4 text-center bg-gradient-to-br from-muted/50 to-muted/30">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </Card>
            ))}
          </div>

          {/* 기능 목록 */}
          <div className="grid sm:grid-cols-2 gap-4">
            {feature.features.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div key={idx} className="flex gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br",
                    feature.gradient
                  )}>
                    <ItemIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA 버튼 */}
          <div className="pt-4">
            <Button variant="outline" className="group">
              더 알아보기
              <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* 이미지/일러스트 영역 */}
        <div className="flex-1 flex items-center justify-center">
          <div className={cn(
            "relative w-full h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br p-1",
            feature.gradient
          )}>
            <div className="w-full h-full rounded-2xl bg-background/95 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <Icon className="h-24 w-24 mx-auto text-primary opacity-20" />
                <p className="text-2xl font-bold text-muted-foreground/50">
                  Interactive Demo
                </p>
                <p className="text-sm text-muted-foreground/40">
                  실제 화면을 미리 체험해보세요
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}