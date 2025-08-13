'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { date: '1/1', profit: 0.02 },
  { date: '1/2', profit: -0.01 },
  { date: '1/3', profit: 0.015 },
  { date: '1/4', profit: 0.03 },
  { date: '1/5', profit: -0.02 },
  { date: '1/6', profit: 0.04 },
];

export default function ProfitRateChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
        <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
        <Line type="monotone" dataKey="profit" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
