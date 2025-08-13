'use client';

import { ResponsiveContainer, ScatterChart, XAxis, YAxis, Tooltip, Scatter, Cell } from 'recharts';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 24 }, (_, i) => i);

const data = days.flatMap((day) =>
  hours.map((hour) => ({
    day,
    hour,
    value: Math.floor(Math.random() * 10),
  }))
);

const getColor = (value: number) => {
  if (value >= 7) return '#1e3a8a';
  if (value >= 5) return '#3b82f6';
  if (value >= 3) return '#93c5fd';
  if (value > 0) return '#bfdbfe';
  return '#e0f2fe';
};

export default function TimeHeatmap() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis
          type="number"
          dataKey="hour"
          name="Hour"
          domain={[0, 23]}
          ticks={[0, 6, 12, 18, 23]}
        />
        <YAxis type="category" dataKey="day" name="Day" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} dataKey="value" shape="square">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
