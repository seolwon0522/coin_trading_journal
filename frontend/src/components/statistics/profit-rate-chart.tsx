'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// 한글 주석: PnL 퍼블릭 API URL 구성
const MONITORING_API_BASE = process.env.NEXT_PUBLIC_MONITORING_API_BASE || 'http://127.0.0.1:5001';
const PUBLIC_TOKEN = process.env.NEXT_PUBLIC_PUBLIC_API_TOKEN || 'public-readonly';

type PnlApiResponse = {
  success: boolean;
  chart_data?: {
    timestamps: string[];
    pnl: number[];
    cum_pnl?: number[];
    return_pct?: number[];
  };
  error?: string;
};

export default function ProfitRateChart() {
  const [series, setSeries] = useState<{ date: string; profit: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const url = `${MONITORING_API_BASE.replace(/\/$/, '')}/api/pnl_history_public?token=${encodeURIComponent(
      PUBLIC_TOKEN
    )}&days=30`;

    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: PnlApiResponse = await r.json();
        if (!data.success || !data.chart_data) throw new Error(data.error || 'API 응답 오류');

        const timestamps = data.chart_data.timestamps || [];
        const returns = data.chart_data.return_pct || [];

        // 한글 주석: return_pct가 없으면 pnl을 기준금액(1000달러) 대비 수익률로 환산
        const computed = timestamps.map((t, i) => {
          const pct =
            returns[i] !== undefined && returns[i] !== null
              ? Number(returns[i]) / 100
              : data.chart_data && data.chart_data.pnl && data.chart_data.pnl[i] !== undefined
                ? Number(data.chart_data.pnl[i]) / 1000
                : 0;
          return { date: new Date(t).toLocaleDateString('ko-KR'), profit: pct };
        });
        setSeries(computed);
      })
      .catch((e) => setError(e.message));

    return () => controller.abort();
  }, []);

  const yFormatter = useMemo(() => (v: number) => `${(v * 100).toFixed(0)}%`, []);
  const tipFormatter = useMemo(() => (v: number) => `${(v * 100).toFixed(2)}%`, []);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={series} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={yFormatter} domain={['auto', 'auto']} />
          <Tooltip formatter={tipFormatter as any} />
          <Line type="monotone" dataKey="profit" stroke="#8884d8" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {error && <div className="text-xs text-destructive mt-1">데이터 로드 실패: {error}</div>}
    </div>
  );
}
