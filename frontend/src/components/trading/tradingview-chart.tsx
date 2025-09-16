'use client';

import { useEffect, useRef, memo } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

export interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  theme?: 'light' | 'dark';
  height?: number;
  autosize?: boolean;
}

function TradingViewChartComponent({
  symbol = 'BTCUSDT',
  interval = '1',
  theme = 'dark',
  height = 600,
  autosize = true,
}: TradingViewChartProps) {
  const container = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // Clean up previous widget
    if (container.current) {
      container.current.innerHTML = '';
    }

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined' && container.current) {
        new window.TradingView.widget({
          autosize: autosize,
          symbol: `BINANCE:${symbol}`,
          interval: interval,
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1', // Candlestick
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: false,
          container_id: container.current.id,
          height: height,
          width: '100%',
          hide_side_toolbar: false,
          studies: [
            'Volume@tv-basicstudies',
            'MASimple@tv-basicstudies',
          ],
          show_popup_button: true,
          popup_width: '1000',
          popup_height: '650',
          no_referral_id: true,
          withdateranges: true,
          hide_top_toolbar: false,
          save_image: true,
          details: true,
          hotlist: true,
          calendar: false,
          watchlist: false,
        });
      }
    };

    scriptRef.current = script;
    document.head.appendChild(script);

    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
      }
    };
  }, [symbol, interval, theme, height, autosize]);

  return (
    <div className="tradingview-widget-container h-full">
      <div id={`tradingview_${symbol}`} ref={container} className="h-full" />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartComponent);