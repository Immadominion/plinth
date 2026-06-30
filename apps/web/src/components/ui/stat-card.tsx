import { Card } from './card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean };
  icon?: React.ReactNode;
  tooltip?: string;
}

export function StatCard({ label, value, sub, trend, icon, tooltip }: StatCardProps) {
  return (
    <Card className="p-6" title={tooltip}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-slate-50">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{sub}</p>}
          {trend && (
            <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-red-500')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400 dark:text-slate-500">{icon}</div>}
      </div>
    </Card>
  );
}
