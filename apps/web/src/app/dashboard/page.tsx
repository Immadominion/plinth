'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, AlertTriangle, CheckCircle, X, Activity, Key, Copy, BookOpen, CreditCard, Webhook, ArrowRight, Sparkles } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MrrChart } from '@/components/charts/mrr-chart';
import { SubDonut } from '@/components/charts/sub-donut';
import { MOCK_STATS, MOCK_EVENTS } from '@/lib/mock-data';
import { formatKobo, formatRelativeDate } from '@/lib/utils';

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

export default function DashboardPage() {
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const isNew = localStorage.getItem('plinth_onboarding_shown') !== 'true';
    if (isNew) setShowOnboarding(true);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="MRR"
            value={formatKobo(MOCK_STATS.mrr)}
            trend={{ value: '12% vs last month', positive: true }}
            icon={<TrendingUp size={20} />}
            tooltip="Monthly Recurring Revenue — sum of all active subscription amounts"
          />
          <StatCard
            label="Active Subscriptions"
            value={String(MOCK_STATS.activeSubscriptions)}
            sub={`${MOCK_STATS.activeSubscriptions - 38} trialing`}
            icon={<Users size={20} />}
            tooltip="Total active + trialing subscriptions"
          />
          <StatCard
            label="Failed Charges"
            value={String(MOCK_STATS.failedCharges)}
            sub={`${formatKobo(MOCK_STATS.failedCharges * 500000)} at risk`}
            icon={<AlertTriangle size={20} />}
            tooltip="Subscriptions that failed their last charge attempt"
          />
          <StatCard
            label="Recovered"
            value={formatKobo(MOCK_STATS.recoveredRevenue)}
            sub="from dunning this month"
            trend={{ value: 'via retry + transfers', positive: true }}
            icon={<CheckCircle size={20} />}
            tooltip="Revenue recovered through dunning retries and transfer rail"
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

        {/* Dunning alert */}
        {!alertDismissed && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>5 subscriptions need attention</strong> — 3 past due, 2 in grace.{' '}
                <Link href="/dashboard/dunning" className="underline hover:no-underline">
                  View dunning board →
                </Link>
              </p>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 ml-4"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Recent events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Events</CardTitle>
            <Link href="/dashboard/events" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              View all →
            </Link>
          </CardHeader>
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {MOCK_EVENTS.slice(0, 5).map((evt) => (
              <div key={evt.id} className="px-6 py-3 flex items-center gap-4">
                <Activity size={14} className="text-gray-400 shrink-0" />
                <code className={`text-xs font-mono flex-1 ${getEventColor(evt.type)}`}>
                  {evt.type}
                </code>
                <span className="text-xs text-gray-400 dark:text-slate-500">{evt.resourceId}</span>
                <Badge status={evt.delivered ? 'delivered' : 'pending'} label={evt.delivered ? 'delivered' : 'pending'} />
                <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                  {formatRelativeDate(evt.occurredAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
