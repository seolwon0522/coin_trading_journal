'use client';

import { useEffect, useRef, memo } from 'react';
import { Card } from '@/components/ui/card';

declare global {
  interface Window {
    TradingView: any;
  }
}

export interface TradingViewAdvancedChartProps {
  symbol: string;
  theme?: 'light' | 'dark';
  height?: number;
  interval?: string;
}

function TradingViewAdvancedChartComponent({
  symbol = 'BTCUSDT',
  theme = 'dark',
  height = 600,
  interval = '60', // Default 1 hour
}: TradingViewAdvancedChartProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clean previous content
    if (container.current) {
      container.current.innerHTML = '';
    }

    // Add TradingView script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      new TradingView.widget({
        "width": "100%",
        "height": ${height},
        "symbol": "BINANCE:${symbol}",
        "interval": "${interval}",
        "timezone": "Asia/Seoul",
        "theme": "${theme}",
        "style": "1",
        "locale": "ko",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "container_id": "tradingview_advanced_${symbol}",
        "studies": [],
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650",
        "support_host": "https://www.tradingview.com"
      });
    `;

    // Add TradingView library script
    const tvScript = document.createElement('script');
    tvScript.src = 'https://s3.tradingview.com/tv.js';
    tvScript.async = true;
    tvScript.onload = () => {
      if (container.current) {
        container.current.appendChild(script);
      }
    };

    document.head.appendChild(tvScript);

    return () => {
      // Cleanup
      if (container.current) {
        container.current.innerHTML = '';
      }
      if (document.head.contains(tvScript)) {
        document.head.removeChild(tvScript);
      }
    };
  }, [symbol, theme, height, interval]);

  return (
    <Card className="h-full overflow-hidden">
      <div className="tradingview-widget-container h-full p-0">
        <div
          id={`tradingview_advanced_${symbol}`}
          ref={container}
          className="h-full"
        />
        <div className="tradingview-widget-copyright">
          <a
            href={`https://www.tradingview.com/symbols/BINANCE-${symbol}/`}
            rel="noopener noreferrer"
            target="_blank"
            className="text-xs text-muted-foreground hover:text-primary"
          >
            <span className="blue-text">{symbol} Chart</span> by TradingView
          </a>
        </div>
      </div>
    </Card>
  );
}

export const TradingViewAdvancedChart = memo(TradingViewAdvancedChartComponent);