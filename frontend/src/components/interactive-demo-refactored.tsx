'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataCollectionDemo } from '@/components/demo/data-collection-demo';
import { AIAnalysisDemo } from '@/components/demo/ai-analysis-demo';
import { AutoTradingDemo } from '@/components/demo/auto-trading-demo';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Brain,
  Bot,
  FileText,
  BarChart3,
  Shield,
} from 'lucide-react';

export function InteractiveDemoRefactored() {
  const [activeTab, setActiveTab] = useState('data');

  const features = [
    {
      id: 'data',
      label: '데이터 수집',
      icon: Activity,
      description: '실시간 시장 데이터 수집',
      component: DataCollectionDemo,
    },
    {
      id: 'ai',
      label: 'AI 분석',
      icon: Brain,
      description: '머신러닝 기반 시장 분석',
      component: AIAnalysisDemo,
    },
    {
      id: 'bot',
      label: '자동매매',
      icon: Bot,
      description: '전략 기반 자동 거래',
      component: AutoTradingDemo,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">인터랙티브 데모</CardTitle>
            <CardDescription className="mt-2">
              CryptoTrader Pro의 핵심 기능을 실시간으로 체험해보세요
            </CardDescription>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Activity className="h-3 w-3 mr-1" />
            실시간 데모
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <TabsTrigger
                  key={feature.id}
                  value={feature.id}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{feature.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {features.map((feature) => {
            const Component = feature.component;
            return (
              <TabsContent key={feature.id} value={feature.id} className="mt-0">
                <div className="space-y-4">
                  {/* Feature Header */}
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{feature.label}</h3>
                    <span className="text-sm text-muted-foreground">
                      - {feature.description}
                    </span>
                  </div>

                  {/* Feature Component */}
                  <Component />
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Bottom Info */}
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">보안 우선</p>
                <p className="text-xs text-muted-foreground">
                  엔터프라이즈급 보안
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">실시간 분석</p>
                <p className="text-xs text-muted-foreground">
                  밀리초 단위 처리
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">상세 리포트</p>
                <p className="text-xs text-muted-foreground">
                  AI 기반 인사이트
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}