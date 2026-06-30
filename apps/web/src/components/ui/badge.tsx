import { cn } from '@/lib/utils';

const stateStyles: Record<string, string> = {
  active:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  trialing:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  incomplete:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  past_due:      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  grace:         'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  delinquent:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  canceled:      'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  paused:        'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
  paid:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  open:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  partially_paid:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  void:          'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
  card:          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  transfer:      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  live:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  test:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  suspense:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  partial:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  delivered:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function Badge({ status, label, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
      stateStyles[status] ?? 'bg-gray-100 text-gray-600',
      className,
    )}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}
