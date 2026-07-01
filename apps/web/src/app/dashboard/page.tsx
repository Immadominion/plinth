'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, AlertTriangle, CheckCircle, X, Activity, Key, Copy, BookOpen, CreditCard, Webhook, ArrowRight, Sparkles, Percent } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MrrChart } from '@/components/charts/mrr-chart';
import { SubDonut } from '@/components/charts/sub-donut';
import { formatKobo, formatRelativeDate } from '@/lib/utils';
import { api } from '@/lib/api';

const eventTypeColor: Record<string, string> = {
  'subscription': 'text-indigo-600 dark:text-indigo-400',
  'invoice': 'text-emerald-600 dark:text-emerald-400',
  'transfer': 'text-blue-600 dark:text-blue-400',
};

function getEventColor(type: string) {
  const family = type.split('.')[0];
  if (type.includes('past_due') || type.includes('grace') || type.includes('delinquent')) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return eventTypeColor[family] ?? 'text-gray-600 dark:text-slate-400';
}

const DEMO_API_KEY = 'sk_live_a1b2c3d4e5f67890';

function OnboardingView({ onDismiss }: { onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(DEMO_API_KEY).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Welcome to Plinth" subtitle="Get started in under 5 minutes" />
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Welcome card */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-indigo-200" />
                <span className="text-sm font-medium text-indigo-200">Account approved</span>
              </div>
              <h2 className="text-xl font-bold mb-1">Your Plinth account is live</h2>
              <p className="text-sm text-indigo-200 leading-relaxed">
                You're now connected to Nomba's payment infrastructure. Start billing your customers in minutes.
              </p>
            </div>
            <CheckCircle size={32} className="text-indigo-300 shrink-0" />
          </div>
        </div>

        {/* API key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key size={16} className="text-indigo-500" />
              Your live API key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-mono text-gray-900 dark:text-slate-100 overflow-x-auto">
                {DEMO_API_KEY}
              </code>
              <button
                onClick={copy}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-slate-300"
              >
                <Copy size={12} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Keep this key private. Never commit it to a repository or share it publicly.
            </p>
          </CardContent>
        </Card>

        {/* Quickstart steps */}
        <Card>
          <CardHeader><CardTitle>Quickstart — 3 API calls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                step: 1,
                title: 'Create a customer',
                code: `curl -X POST https://api.useplinth.com/v1/customers \\
  -H "Authorization: Bearer ${DEMO_API_KEY}" \\
  -d '{"name":"Acme Corp","email":"billing@acme.ng"}'`,
                href: '/docs/api-reference/create-customer',
              },
              {
                step: 2,
                title: 'Subscribe them to a plan',
                code: `curl -X POST https://api.useplinth.com/v1/subscriptions \\
  -H "Authorization: Bearer ${DEMO_API_KEY}" \\
  -d '{"customer_id":"cus_...","plan_id":"pln_..."}'`,
                href: '/docs/api-reference/create-subscription',
              },
              {
                step: 3,
                title: 'Check entitlements before serving features',
                code: `curl https://api.useplinth.com/v1/customers/cus_.../entitlements \\
  -H "Authorization: Bearer ${DEMO_API_KEY}"`,
                href: '/docs/api-reference/get-customer-entitlements',
              },
            ].map(({ step, title, code, href }) => (
              <div key={step} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{step}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{title}</p>
                  <pre className="text-xs bg-gray-50 dark:bg-slate-800 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-slate-300 font-mono whitespace-pre-wrap break-all">
                    {code}
                  </pre>
                  <Link href={href} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    View full docs <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Next steps */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <BookOpen size={16} />, title: 'Read the docs', desc: 'Full API reference, guides, and SDKs', href: '/docs' },
            { icon: <CreditCard size={16} />, title: 'Set up plans', desc: 'Create your billing catalog', href: '/dashboard/catalog' },
            { icon: <Webhook size={16} />, title: 'Configure webhooks', desc: 'Get notified on every event', href: '/dashboard/settings' },
            { icon: <Users size={16} />, title: 'Invite your team', desc: 'Coming soon', href: '#' },
          ].map(({ icon, title, desc, href }) => (
            <Link key={title} href={href} className="group block">
              <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm transition-all">
                <div className="text-indigo-500 mb-2">{icon}</div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{title}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <button onClick={onDismiss} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 underline">
            Skip to dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}

interface LiveStats {
  mrr: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  accruedRevenue: number;
  plinthRevenue: number;
}

async function fetchLiveStats(): Promise<LiveStats> {
  const [subsRes, plansRes, invoicesRes] = await Promise.allSettled([
    api.subscriptions.list() as Promise<{ data: any[] }>,
    api.plans.list()         as Promise<{ data: any[] }>,
    api.invoices.list()      as Promise<{ data: any[] }>,
  ]);

  const subs     = subsRes.status     === 'fulfilled' ? (subsRes.value.data     ?? []) : [];
  const plans    = plansRes.status    === 'fulfilled' ? (plansRes.value.data    ?? []) : [];
  const invoices = invoicesRes.status === 'fulfilled' ? (invoicesRes.value.data ?? []) : [];

  const planMap = new Map(plans.map((p: any) => [p.id, Number(p.amount_minor)]));

  const activeSubs   = subs.filter((s: any) => s.state === 'active' || s.state === 'trialing');
  const pastDueSubs  = subs.filter((s: any) => s.state === 'past_due' || s.state === 'grace' || s.state === 'delinquent');
  const mrr          = activeSubs.reduce((sum: number, s: any) => sum + (planMap.get(s.plan_id) ?? 0), 0);
  const accruedRevenue = invoices
    .filter((inv: any) => inv.state === 'paid')
    .reduce((sum: number, inv: any) => sum + Number(inv.amount_paid ?? 0), 0);

  return {
    mrr,
    activeSubscriptions: activeSubs.length,
    pastDueSubscriptions: pastDueSubs.length,
    accruedRevenue,
    plinthRevenue: Math.round(accruedRevenue * 0.005),  // 0.5% split retained by Plinth
  };
}

export default function DashboardPage() {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  useEffect(() => {
    const isNew = localStorage.getItem('plinth_onboarding_shown') !== 'true';
    if (isNew) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    fetchLiveStats().then(setStats).catch(() => {});
    api.invoices.list()
      .then((res: any) => setRecentInvoices((res.data ?? []).slice(0, 5)))
      .catch(() => {});
  }, []);

  function dismissOnboarding() {
    localStorage.setItem('plinth_onboarding_shown', 'true');
    setShowOnboarding(false);
  }

  if (showOnboarding) {
    return <OnboardingView onDismiss={dismissOnboarding} />;
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Overview" subtitle="June 2026" />

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="MRR"
            value={stats ? formatKobo(stats.mrr) : '—'}
            icon={<TrendingUp size={20} />}
            tooltip="Monthly Recurring Revenue — sum of all active + trialing subscription amounts"
          />
          <StatCard
            label="Active Subscriptions"
            value={stats ? String(stats.activeSubscriptions) : '—'}
            icon={<Users size={20} />}
            tooltip="Total active + trialing subscriptions"
          />
          <StatCard
            label="Past Due"
            value={stats ? String(stats.pastDueSubscriptions) : '—'}
            icon={<AlertTriangle size={20} />}
            tooltip="Subscriptions in past_due, grace, or delinquent state"
          />
          <StatCard
            label="Tenant Revenue"
            value={stats ? formatKobo(stats.accruedRevenue) : '—'}
            sub="from paid invoices"
            icon={<CheckCircle size={20} />}
            tooltip="Total revenue collected on behalf of tenants — sum of all paid invoices"
          />
          <StatCard
            label="Plinth Revenue"
            value={stats ? formatKobo(stats.plinthRevenue) : '—'}
            sub="0.5% platform fee"
            icon={<Percent size={20} />}
            tooltip="Plinth's earnings — 0.5% of all settled payments (retained in main Nomba account via split)"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>MRR Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <MrrChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <SubDonut />
            </CardContent>
          </Card>
        </div>

        {/* Dunning alert — only shown when there are real past-due subscriptions */}
        {!alertDismissed && stats && stats.pastDueSubscriptions > 0 && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>{stats.pastDueSubscriptions} subscription{stats.pastDueSubscriptions > 1 ? 's' : ''} need attention</strong> — past due or in grace.{' '}
                <Link href="/dashboard/dunning" className="underline hover:no-underline">
                  View dunning board →
                </Link>
              </p>
            </div>
            <button onClick={() => setAlertDismissed(true)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 ml-4">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Recent invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link href="/dashboard/invoices" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              View all →
            </Link>
          </CardHeader>
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {recentInvoices.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400 dark:text-slate-500">No invoices yet</p>
            ) : recentInvoices.map((inv) => (
              <div key={inv.id} className="px-6 py-3 flex items-center gap-4">
                <Activity size={14} className="text-gray-400 shrink-0" />
                <span className="font-mono text-xs text-gray-500 dark:text-slate-400 flex-1 truncate">{inv.id}</span>
                <Badge status={inv.state} label={inv.state} />
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                  {formatKobo(Number(inv.amount_due))}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                  {inv.created_at ? formatRelativeDate(inv.created_at) : '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
