'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const winRateData = [
  { name: 'Win', value: 65 },
  { name: 'Loss', value: 35 },
];

const ratioData = [
  { name: 'Profit', value: 150 },
  { name: 'Loss', value: 100 },
];

const COLORS = ['#4ade80', '#f87171'];

export default function WinRateRatioChart() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={winRateData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {winRateData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={ratioData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              {ratioData.map((entry, index) => (
                <Cell key={`cell-bar-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
