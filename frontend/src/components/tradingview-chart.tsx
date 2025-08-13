'use client';

import { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
  height?: number;
}

// TradingView 차트 컴포넌트
export function TradingViewChart({ symbol, height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 스크립트 제거
    const existingScript = document.querySelector('script[src*="tradingview"]');
    if (existingScript) {
      existingScript.remove();
    }

    // TradingView 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as { TradingView: any }).TradingView
      ) {
        new (window as unknown as { TradingView: any }).TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol}`,
          interval: 'D',
          timezone: 'Asia/Seoul',
          theme: 'dark',
          style: '1',
          locale: 'kr',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current?.id,
          width: '100%',
          height: height,
          studies: [], // 기술적 지표 없음
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          hide_side_toolbar: false,
          hide_legend: false,
          save_image: false,
          backgroundColor: 'rgba(19, 23, 34, 1)',
          gridColor: 'rgba(42, 46, 57, 1)',
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // 컴포넌트 언마운트 시 스크립트 제거
      const scriptElement = document.querySelector('script[src*="tradingview"]');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [symbol, height]);

  return (
    <div className="tradingview-widget-container w-full">
      <div
        id={`tradingview_${symbol}`}
        ref={containerRef}
        style={{ width: '100%', height: `${height}px` }}
        className="w-full"
      />
    </div>
  );
}
