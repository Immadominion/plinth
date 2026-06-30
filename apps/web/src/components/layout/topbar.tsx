'use client';
import { ThemeToggle } from './theme-toggle';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopbarProps { title: string; subtitle?: string }

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="h-14 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm"><Search size={16} /></Button>
        <Button variant="ghost" size="sm"><Bell size={16} /></Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
