'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MOCK_MRR_TREND } from '@/lib/mock-data';
import { formatKobo } from '@/lib/utils';

export function MrrChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={MOCK_MRR_TREND}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v: number) => `₦${(v/100000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v: number) => [formatKobo(v), 'MRR']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Line type="monotone" dataKey="mrr" stroke="#4f46e5" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
