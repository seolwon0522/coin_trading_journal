'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Shield,
  Zap,
  RefreshCw,
  Target,
} from 'lucide-react';
import { generateMLScore } from '@/lib/demo/data-generators';
import { cn } from '@/lib/utils';

interface AIInsight {
  id: string;
  type: 'bullish' | 'bearish' | 'neutral';
  message: string;
  confidence: number;
  timestamp: string;
}

export function AIAnalysisDemo() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mlScore, setMlScore] = useState(generateMLScore());
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [patterns, setPatterns] = useState([
    { name: 'Ascending Triangle', detected: true, confidence: 85 },
    { name: 'Support Level', detected: true, confidence: 92 },
    { name: 'Volume Spike', detected: false, confidence: 45 },
    { name: 'RSI Divergence', detected: true, confidence: 78 },
  ]);

  const runAnalysis = () => {
    setIsAnalyzing(true);

    // 분석 시뮬레이션
    setTimeout(() => {
      setMlScore(generateMLScore());

      // 새 인사이트 생성
      const newInsight: AIInsight = {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() > 0.5 ? 'bullish' : 'bearish',
        message: [
          '강한 매수 신호가 감지되었습니다',
          'RSI가 과매도 구간에 진입했습니다',
          '거래량이 평균 대비 200% 증가했습니다',
          '주요 지지선에서 반등 가능성이 높습니다',
        ][Math.floor(Math.random() * 4)],
        confidence: Math.floor(Math.random() * 30 + 70),
        timestamp: new Date().toLocaleTimeString(),
      };

      setInsights(prev => [newInsight, ...prev.slice(0, 2)]);

      // 패턴 업데이트
      setPatterns(prev => prev.map(p => ({
        ...p,
        detected: Math.random() > 0.4,
        confidence: Math.floor(Math.random() * 40 + 60),
      })));

      setIsAnalyzing(false);
    }, 2000);
  };

  useEffect(() => {
    // 초기 인사이트 생성
    const initialInsights: AIInsight[] = [
      {
        id: '1',
        type: 'bullish',
        message: 'BTC가 강한 상승 모멘텀을 보이고 있습니다',
        confidence: 87,
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: '2',
        type: 'neutral',
        message: '현재 시장은 횡보 구간에 있습니다',
        confidence: 75,
        timestamp: new Date().toLocaleTimeString(),
      },
    ];
    setInsights(initialInsights);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI 분석 엔진
        </h3>
        <Button
          size="sm"
          onClick={runAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-1" />
              실시간 분석
            </>
          )}
        </Button>
      </div>

      {/* ML 스코어 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">ML 예측 스코어</h4>
          <Badge
            variant={mlScore.prediction === 'BULLISH' ? 'default' : 'secondary'}
          >
            {mlScore.prediction}
          </Badge>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>신뢰도</span>
              <span className="font-medium">{mlScore.confidence.toFixed(1)}%</span>
            </div>
            <Progress value={mlScore.confidence} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">예상 수익률</p>
                <p className={cn(
                  "text-sm font-medium",
                  mlScore.expectedReturn > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {mlScore.expectedReturn > 0 ? '+' : ''}{mlScore.expectedReturn.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">리스크 레벨</p>
                <p className="text-sm font-medium">{mlScore.riskLevel.toFixed(1)}/5.0</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 패턴 인식 */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">패턴 인식</h4>
        <div className="space-y-2">
          {patterns.map((pattern, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pattern.detected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn(
                  "text-sm",
                  pattern.detected ? "font-medium" : "text-muted-foreground"
                )}>
                  {pattern.name}
                </span>
              </div>
              <Badge
                variant={pattern.detected ? "default" : "outline"}
                className="text-xs"
              >
                {pattern.confidence}%
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* AI 인사이트 */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">AI 인사이트</h4>
        <div className="space-y-2">
          {insights.map(insight => (
            <div
              key={insight.id}
              className="p-3 rounded-lg bg-muted/50 animate-fade-in"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {insight.type === 'bullish' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : insight.type === 'bearish' ? (
                    <TrendingDown className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm">{insight.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {insight.timestamp}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {insight.confidence}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}