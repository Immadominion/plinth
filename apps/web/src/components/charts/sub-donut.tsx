'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MOCK_SUB_STATES } from '@/lib/mock-data';

export function SubDonut() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={MOCK_SUB_STATES} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="count" nameKey="state">
          {MOCK_SUB_STATES.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number, name: string) => [v, name.replace(/_/g, ' ')]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '12px', color: '#6b7280' }}>{(v as string).replace(/_/g, ' ')}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
