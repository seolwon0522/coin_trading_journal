'use client';

import { useState } from 'react';
import {
  ChevronDown,
  MessageCircle,
  Shield,
  DollarSign,
  Bot,
  HelpCircle,
  Zap,
  Database,
  Clock,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

const faqData: FAQItem[] = [
  {
    question: 'CryptoTradeManager는 어떻게 작동하나요?',
    answer: 'Binance API를 통해 실시간으로 거래 데이터를 수집하고, AI 엔진이 이를 분석하여 매매 신호를 생성합니다. 설정한 전략에 따라 자동매매 봇이 24/7 거래를 실행하며, 모든 거래는 자동으로 기록되어 성과 분석에 활용됩니다.',
    category: '기본',
    icon: HelpCircle,
  },
  {
    question: '초보자도 사용할 수 있나요?',
    answer: '물론입니다! 직관적인 인터페이스와 가이드 투어를 제공하며, 초보자를 위한 템플릿 전략과 리스크 관리 도구가 내장되어 있습니다. 또한 24/7 고객 지원과 교육 자료를 제공합니다.',
    category: '기본',
    icon: Users,
  },
  {
    question: '내 자산은 안전한가요?',
    answer: 'CryptoTradeManager는 거래소 API를 통해서만 작동하며, 출금 권한은 요청하지 않습니다. 모든 데이터는 AES-256으로 암호화되고, 2FA 인증과 IP 화이트리스트를 지원합니다. 또한 정기적인 보안 감사를 실시합니다.',
    category: '보안',
    icon: Shield,
  },
  {
    question: 'API 키는 어떻게 보호되나요?',
    answer: 'API 키는 암호화되어 저장되며, 출금 권한이 없는 거래 전용 API만 사용합니다. 서버는 AWS의 보안 인프라를 사용하고, 모든 통신은 SSL/TLS로 암호화됩니다.',
    category: '보안',
    icon: Shield,
  },
  {
    question: '무료 플랜과 유료 플랜의 차이는 무엇인가요?',
    answer: '무료 플랜은 기본 기능과 제한된 API 호출을 제공합니다. 유료 플랜은 무제한 API 호출, 고급 AI 분석, 다중 봇 운영, 우선 지원, 백테스팅 기능 등을 포함합니다.',
    category: '요금제',
    icon: DollarSign,
  },
  {
    question: '언제든 요금제를 변경할 수 있나요?',
    answer: '네, 언제든지 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드는 즉시 적용되며, 다운그레이드는 현재 결제 주기가 끝난 후 적용됩니다.',
    category: '요금제',
    icon: DollarSign,
  },
  {
    question: '자동매매 봇은 얼마나 효과적인가요?',
    answer: '봇의 성과는 전략과 시장 상황에 따라 다릅니다. 평균적으로 사용자들은 32%의 연수익률을 기록했으며, 백테스팅으로 전략을 최적화할 수 있습니다.',
    category: '자동매매',
    icon: Bot,
  },
  {
    question: '여러 개의 봇을 동시에 운영할 수 있나요?',
    answer: '프로 플랜부터 최대 5개, 엔터프라이즈 플랜은 무제한 봇 운영이 가능합니다. 각 봇은 독립적인 전략과 설정으로 운영됩니다.',
    category: '자동매매',
    icon: Bot,
  },
  {
    question: '실시간 데이터는 얼마나 빠른가요?',
    answer: 'WebSocket을 통해 밀리초 단위로 실시간 데이터를 수신합니다. 평균 지연 시간은 50ms 이하이며, 99.9%의 가동률을 보장합니다.',
    category: '기술',
    icon: Zap,
  },
  {
    question: '과거 데이터는 얼마나 제공되나요?',
    answer: '최대 10년간의 과거 데이터를 제공하며, 1분봉부터 일봉까지 다양한 시간 프레임을 지원합니다. 백테스팅에 활용할 수 있습니다.',
    category: '기술',
    icon: Database,
  },
  {
    question: '고객 지원은 어떻게 받을 수 있나요?',
    answer: '24/7 라이브 채팅, 이메일 지원, 전화 상담(프로 플랜 이상)을 제공합니다. 평균 응답 시간은 30분 이내입니다.',
    category: '지원',
    icon: MessageCircle,
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer: '30일 무조건 환불 보장을 제공합니다. 서비스에 만족하지 않으시면 이유를 묻지 않고 전액 환불해 드립니다.',
    category: '지원',
    icon: Clock,
  },
];

const categories = [
  { name: '전체', icon: HelpCircle },
  { name: '기본', icon: HelpCircle },
  { name: '보안', icon: Shield },
  { name: '요금제', icon: DollarSign },
  { name: '자동매매', icon: Bot },
  { name: '기술', icon: Database },
  { name: '지원', icon: MessageCircle },
];

export function FAQSection({ className = '' }: { className?: string }) {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const filteredFAQs = selectedCategory === '전체' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <section className={cn('py-20 px-6', className)}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <HelpCircle className="h-3 w-3 mr-1" />
            자주 묻는 질문
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            궁금한 점이 <span className="text-primary">해결</span>되셨나요?
          </h2>
          <p className="text-xl text-muted-foreground">
            가장 많이 묻는 질문들을 모았습니다
          </p>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map(category => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                selectedCategory === category.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              <category.icon className="inline h-3 w-3 mr-1" />
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ 아이템들 */}
        <div className="space-y-4">
          {filteredFAQs.map((item, index) => {
            const isExpanded = expandedItems.has(index);
            const Icon = item.icon;
            
            return (
              <Card
                key={index}
                className="overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                <button
                  onClick={() => toggleExpanded(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between group hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.question}
                    </h3>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-muted-foreground transition-transform duration-300 shrink-0',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="px-6 pb-4 border-t border-border/50 pt-4 animate-in slide-in-from-top-1 duration-200">
                    <p className="text-muted-foreground pl-8 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* 추가 도움말 */}
        <div className="mt-12 text-center">
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-purple-600/5">
            <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">더 궁금한 점이 있으신가요?</h3>
            <p className="text-muted-foreground mb-4">
              24/7 고객 지원팀이 도와드리겠습니다
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                라이브 채팅 시작
              </button>
              <button className="px-6 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                support@cryptotrademanager.com
              </button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}