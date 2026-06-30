import { cn } from '@/lib/utils';

export function Table({ className, children }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full text-sm', className)}>{children}</table>;
}

export function Thead({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead>{children}</thead>;
}

export function Th({ className, children }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide border-b border-gray-100 dark:border-slate-800', className)}>
      {children}
    </th>
  );
}

export function Tbody({ children }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">{children}</tbody>;
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

export function Td({ className, children }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 text-gray-700 dark:text-slate-300', className)}>{children}</td>;
}
