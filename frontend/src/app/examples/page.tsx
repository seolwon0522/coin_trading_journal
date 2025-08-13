'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CoinPriceDisplay } from '@/components/coin-price-display';
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Heart,
  Star,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  BarChart3,
  FileText,
  Code2,
} from 'lucide-react';

export default function ExamplesPage() {
  const [likeCount, setLikeCount] = useState(0);

  // 토스트 예시 함수들
  const showSuccessToast = () => {
    toast.success('성공!', {
      description: '작업이 성공적으로 완료되었습니다.',
      icon: <CheckCircle className="h-4 w-4" />,
    });
  };

  const showErrorToast = () => {
    toast.error('오류 발생', {
      description: '문제가 발생했습니다. 다시 시도해주세요.',
      icon: <XCircle className="h-4 w-4" />,
    });
  };

  const showWarningToast = () => {
    toast.warning('주의사항', {
      description: '이 작업은 되돌릴 수 없습니다.',
      icon: <AlertCircle className="h-4 w-4" />,
    });
  };

  const showInfoToast = () => {
    toast.info('정보', {
      description: '새로운 기능이 추가되었습니다!',
      icon: <Info className="h-4 w-4" />,
    });
  };

  const showActionToast = () => {
    toast('매매 기록 삭제', {
      description: '정말로 이 기록을 삭제하시겠습니까?',
      action: {
        label: '삭제',
        onClick: () => toast.success('삭제되었습니다'),
      },
    });
  };

  const handleLike = () => {
    setLikeCount((prev) => prev + 1);
    toast.success(`좋아요! (${likeCount + 1})`, {
      description: '이 기능이 마음에 드시는군요!',
      icon: <Heart className="h-4 w-4 text-red-500" />,
    });
  };

  return (
    <div className="min-h-full bg-background">
      {/* 페이지 헤더 */}
      <div className="border-b bg-muted/50">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Code2 className="h-8 w-8" />
            컴포넌트 예제
          </h1>
          <p className="text-muted-foreground mt-2">
            프로젝트에서 사용된 Shadcn UI 컴포넌트들과 기능 예제를 확인하세요.
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-6 space-y-8">
        {/* React Query + Axios 예제 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            📈 React Query + Axios 예제
          </h2>
          <p className="text-muted-foreground mb-4">실시간 API 데이터 페칭과 상태 관리 예제</p>
          <CoinPriceDisplay />
        </section>

        {/* Shadcn UI 버튼 예제 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            🎯 Shadcn UI 버튼 컬렉션
          </h2>
          <p className="text-muted-foreground mb-6">다양한 버튼 스타일과 상태, 크기별 예제</p>

          <div className="grid gap-6">
            {/* 기본 버튼들 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">기본 스타일</h3>
              <div className="flex gap-3 flex-wrap">
                <Button variant="default">
                  <Plus className="h-4 w-4 mr-2" />
                  매매 기록 추가
                </Button>
                <Button variant="secondary">
                  <Download className="h-4 w-4 mr-2" />
                  데이터 내보내기
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  파일 업로드
                </Button>
                <Button variant="ghost">
                  <Star className="h-4 w-4 mr-2" />
                  즐겨찾기
                </Button>
              </div>
            </div>

            {/* 상태별 버튼들 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">상태별 스타일</h3>
              <div className="flex gap-3 flex-wrap">
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  기록 삭제
                </Button>
                <Button variant="default" disabled>
                  로딩 중...
                </Button>
                <Button variant="outline" onClick={handleLike}>
                  <Heart className="h-4 w-4 mr-2 text-red-500" />
                  좋아요 ({likeCount})
                </Button>
              </div>
            </div>

            {/* 크기별 버튼들 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">다양한 크기</h3>
              <div className="flex gap-3 items-center flex-wrap">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Toast 예제 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            🔔 Toast 알림 예제
          </h2>
          <p className="text-muted-foreground mb-6">
            Sonner 기반 토스트 알림 시스템의 다양한 타입과 액션
          </p>

          <div className="grid gap-4">
            <div>
              <h3 className="text-lg font-medium mb-3">알림 타입별</h3>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" onClick={showSuccessToast}>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  성공 알림
                </Button>
                <Button variant="outline" onClick={showErrorToast}>
                  <XCircle className="h-4 w-4 mr-2 text-red-500" />
                  오류 알림
                </Button>
                <Button variant="outline" onClick={showWarningToast}>
                  <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                  경고 알림
                </Button>
                <Button variant="outline" onClick={showInfoToast}>
                  <Info className="h-4 w-4 mr-2 text-blue-500" />
                  정보 알림
                </Button>
                <Button variant="outline" onClick={showActionToast}>
                  액션 포함 알림
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 기능 소개 카드들 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">✨ 주요 기능 카드</h2>
          <p className="text-muted-foreground mb-6">
            프로젝트의 핵심 기능들을 소개하는 카드 컴포넌트
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">매매 기록 관리</h3>
              <p className="text-sm text-muted-foreground">
                모든 거래 내역을 체계적으로 기록하고 관리할 수 있습니다.
              </p>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">상세 분석</h3>
              <p className="text-sm text-muted-foreground">
                수익률, 승률 등 다양한 지표로 투자 성과를 분석합니다.
              </p>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">리포트 생성</h3>
              <p className="text-sm text-muted-foreground">
                월별, 분기별 상세 리포트를 자동으로 생성합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 기술 스택 정보 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">🛠 기술 스택 정보</h2>
          <p className="text-muted-foreground mb-6">프로젝트에서 사용된 주요 기술들과 버전 정보</p>

          <div className="bg-muted/50 rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-2">
                <div className="font-semibold text-primary">Next.js 14</div>
                <div className="text-sm text-muted-foreground">App Router</div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">TypeScript</div>
                <div className="text-sm text-muted-foreground">타입 안정성</div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Tailwind CSS</div>
                <div className="text-sm text-muted-foreground">반응형 디자인</div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Shadcn UI</div>
                <div className="text-sm text-muted-foreground">컴포넌트 시스템</div>
              </div>
            </div>
          </div>
        </section>

        {/* 개발자 정보 */}
        <section className="border-t pt-8">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">개발 정보</h3>
            <p className="text-sm text-muted-foreground">
              이 페이지는 프로젝트에서 사용된 컴포넌트들의 예제를 모아놓은 데모 페이지입니다.
            </p>
            <p className="text-xs text-muted-foreground">
              실제 사용은 대시보드와 매매 기록 페이지에서 확인하세요.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
