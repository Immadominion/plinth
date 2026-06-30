import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
