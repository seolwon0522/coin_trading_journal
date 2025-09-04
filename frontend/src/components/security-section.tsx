'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Shield,
  Lock,
  Key,
  Eye,
  CheckCircle,
  Award,
  Server,
  Fingerprint,
  ShieldCheck,
  Database,
  Globe,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SecurityFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlight?: string;
}

const securityFeatures: SecurityFeature[] = [
  {
    icon: Lock,
    title: 'AES-256 암호화',
    description: '모든 데이터는 군사급 암호화로 보호됩니다',
    highlight: '군사급',
  },
  {
    icon: Key,
    title: 'API 키 보안',
    description: '출금 권한 없는 읽기 전용 API만 사용',
    highlight: '출금 불가',
  },
  {
    icon: Fingerprint,
    title: '2단계 인증',
    description: 'Google Authenticator 및 SMS 2FA 지원',
    highlight: '2FA',
  },
  {
    icon: ShieldCheck,
    title: 'DDoS 방어',
    description: 'Cloudflare 엔터프라이즈 보안',
    highlight: '24/7',
  },
  {
    icon: Server,
    title: 'AWS 인프라',
    description: '세계 최고 수준의 클라우드 보안',
    highlight: 'AWS',
  },
  {
    icon: Eye,
    title: '실시간 모니터링',
    description: '이상 거래 탐지 및 즉시 알림',
    highlight: 'AI 감지',
  },
];

const certifications = [
  { name: 'ISO 27001', description: '정보보안 관리체계' },
  { name: 'SOC 2 Type II', description: '보안 및 가용성' },
  { name: 'GDPR', description: '개인정보보호 규정' },
  { name: 'PCI DSS', description: '결제 카드 산업 표준' },
];

function useScrollAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
}

export function SecuritySection({ className = '' }: { className?: string }) {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section className={cn('py-20 px-6', className)}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Shield className="h-3 w-3 mr-1" />
            보안 & 신뢰성
          </Badge>
          <h2 className="text-4xl font-bold mb-4">
            당신의 자산은 <span className="text-primary">철벽 보안</span>으로 지켜집니다
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            업계 최고 수준의 보안 시스템과 24/7 모니터링으로 안전한 거래를 보장합니다
          </p>
        </div>

        {/* 보안 기능 그리드 */}
        <div ref={ref} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className={cn(
                  'p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-500',
                  isVisible && `animate-fade-in-up`
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute top-0 right-0 p-2">
                  {feature.highlight && (
                    <Badge variant="secondary" className="text-xs">
                      {feature.highlight}
                    </Badge>
                  )}
                </div>
                <Icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Card>
            );
          })}
        </div>

        {/* 인증서 섹션 */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">
            국제 보안 인증
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {certifications.map((cert, index) => (
              <Card
                key={index}
                className={cn(
                  'p-6 text-center hover:shadow-lg transition-all duration-300',
                  isVisible && 'animate-zoom-in'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Award className="h-8 w-8 text-primary mx-auto mb-3" />
                <h4 className="font-semibold">{cert.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {cert.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* 보안 통계 */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 via-purple-600/5 to-pink-600/5">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <Database className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">보안 사고</p>
            </div>
            <div>
              <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold">99.9%</div>
              <p className="text-sm text-muted-foreground">가동률</p>
            </div>
            <div>
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold">&lt;50ms</div>
              <p className="text-sm text-muted-foreground">응답 시간</p>
            </div>
            <div>
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold">24/7</div>
              <p className="text-sm text-muted-foreground">보안 모니터링</p>
            </div>
          </div>
        </Card>

        {/* 보안 약속 */}
        <div className="mt-16 text-center">
          <Card className="p-8 max-w-3xl mx-auto">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">우리의 보안 약속</h3>
            <p className="text-muted-foreground mb-6">
              CryptoTradeManager는 사용자의 자산 보호를 최우선으로 합니다.
              <br />
              출금 권한이 없는 API만 사용하며, 모든 데이터는 암호화되어 저장됩니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">정기 보안 감사</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">버그 바운티 프로그램</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">침투 테스트</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}