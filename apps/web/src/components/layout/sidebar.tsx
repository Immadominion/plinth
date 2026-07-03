'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, CreditCard, AlertTriangle,
  FileText, ArrowLeftRight, Package, Activity, Settings, Zap,
  Webhook, LogOut, ChevronUp,
} from 'lucide-react';
import { api, logout } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/dashboard',               icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/customers',     icon: Users,           label: 'Customers' },
  { href: '/dashboard/subscriptions', icon: CreditCard,      label: 'Subscriptions' },
  { href: '/dashboard/dunning',       icon: AlertTriangle,   label: 'Dunning', badge: '5' },
  { href: '/dashboard/invoices',      icon: FileText,        label: 'Invoices' },
  { href: '/dashboard/transfers',     icon: ArrowLeftRight,  label: 'Transfers' },
  { href: '/dashboard/catalog',       icon: Package,         label: 'Catalog' },
  { href: '/dashboard/events',        icon: Activity,        label: 'Events' },
  { href: '/dashboard/webhooks',      icon: Webhook,         label: 'Webhooks' },
  { href: '/dashboard/settings',      icon: Settings,        label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.me.get().then((t) => setTenant({ id: t.id, name: t.name })).catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleSignOut() {
    logout();
    router.push('/login');
  }

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Plinth</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-gray-400 dark:text-slate-500">Test mode</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              )}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: account + sign-out menu */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-slate-800 relative" ref={menuRef}>
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              {(tenant?.name ?? '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-slate-300 truncate">{tenant?.name ?? 'Loading…'}</p>
            <p className="text-xs text-gray-400 dark:text-slate-600 truncate">{tenant?.id ?? ''}</p>
          </div>
          <ChevronUp size={14} className={cn('text-gray-400 transition-transform', !menuOpen && 'rotate-180')} />
        </button>
      </div>
    </aside>
  );
}
