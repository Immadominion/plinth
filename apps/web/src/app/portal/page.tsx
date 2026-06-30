'use client';
import { useState } from 'react';
import { Copy, Check, Zap, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatKobo, formatDate } from '@/lib/utils';

const PORTAL_PLAN = {
  name: 'Pro',
  status: 'active' as const,
  amount: 500000,
  nextBillDate: '2026-07-01',
  interval: 'month',
};

const PORTAL_VA = {
  accountNumber: '9391234567',
  bankName: 'Nomba MFB',
  accountName: 'Acme Technologies — Plinth',
};

const PORTAL_INVOICE = {
  id: 'inv_02',
  amountDue: 500000,
  amountPaid: 0,
  dueAt: '2026-07-01',
  hasOutstanding: false,
};

const PORTAL_HISTORY = [
  { id: 'inv_h1', date: '2026-06-01', amount: 500000, status: 'paid' as const },
  { id: 'inv_h2', date: '2026-05-01', amount: 500000, status: 'paid' as const },
  { id: 'inv_h3', date: '2026-04-01', amount: 500000, status: 'paid' as const },
  { id: 'inv_h4', date: '2026-03-01', amount: 500000, status: 'paid' as const },
  { id: 'inv_h5', date: '2026-02-01', amount: 500000, status: 'paid' as const },
  { id: 'inv_h6', date: '2026-01-01', amount: 500000, status: 'paid' as const },
];

const ALL_PLANS = [
  { id: 'plan_starter', name: 'Starter', amount: 200000, features: ['Up to 3 users', '5GB storage', 'Email support'] },
  { id: 'plan_pro', name: 'Pro', amount: 500000, features: ['Up to 25 users', '50GB storage', 'Priority support', 'API access'] },
  { id: 'plan_max', name: 'Max', amount: 1200000, features: ['Unlimited users', '500GB storage', 'Dedicated support', 'API access', 'Custom integrations'] },
];

export default function PortalPage() {
  const [copied, setCopied] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('plan_pro');

  function copyAccountNumber() {
    navigator.clipboard.writeText(PORTAL_VA.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Plinth</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">via Acme SaaS Co</span>
            </div>
          </div>
          <a href="mailto:support@acme.ng" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            Support <ExternalLink size={10} />
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {/* Your plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your Plan</CardTitle>
              <Badge status={PORTAL_PLAN.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{PORTAL_PLAN.name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {formatKobo(PORTAL_PLAN.amount)} / {PORTAL_PLAN.interval} · renews {formatDate(PORTAL_PLAN.nextBillDate)}
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowPlanModal(true)}>
                Change plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* VA / Pay by transfer */}
        <Card>
          <CardHeader>
            <CardTitle>Pay by Bank Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-xl">
              <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-3">{PORTAL_VA.bankName}</p>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-3xl font-semibold font-mono text-gray-900 dark:text-slate-50 tracking-wider">
                  {PORTAL_VA.accountNumber}
                </p>
                <button
                  onClick={copyAccountNumber}
                  className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">{PORTAL_VA.accountName}</p>
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Transfer your exact invoice amount to this account. We&apos;ll match it automatically within minutes.
            </p>

            {PORTAL_INVOICE.hasOutstanding && (
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-lg">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Active invoice amount</p>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{formatKobo(PORTAL_INVOICE.amountDue - PORTAL_INVOICE.amountPaid)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outstanding invoice */}
        <Card>
          <CardHeader><CardTitle>Outstanding Invoice</CardTitle></CardHeader>
          <CardContent>
            {PORTAL_INVOICE.hasOutstanding ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Amount due</p>
                    <p className="text-2xl font-semibold text-amber-900 dark:text-amber-100 mt-1">
                      {formatKobo(PORTAL_INVOICE.amountDue - PORTAL_INVOICE.amountPaid)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-amber-600 dark:text-amber-400">Due {formatDate(PORTAL_INVOICE.dueAt)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl">
                <Check size={18} className="text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">All paid up</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">No outstanding invoices</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PORTAL_HISTORY.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-slate-300">{formatKobo(inv.amount)}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{formatDate(inv.date)}</p>
                  </div>
                  <Badge status={inv.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-6 py-6 text-center">
        <p className="text-xs text-gray-400 dark:text-slate-600">
          Powered by{' '}
          <a href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">Plinth</a>
          {' '}·{' '}
          <a href="mailto:support@acme.ng" className="hover:underline">Contact support</a>
        </p>
      </footer>

      {/* Plan change modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Change Plan</CardTitle>
                <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">×</button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ALL_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedPlan === plan.id
                      ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{plan.name}</p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                      {formatKobo(plan.amount)}<span className="text-xs font-normal text-gray-400">/mo</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.features.map((f) => (
                      <span key={f} className="text-xs text-gray-500 dark:text-slate-400">· {f}</span>
                    ))}
                  </div>
                </button>
              ))}
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => setShowPlanModal(false)}>
                  Confirm change
                </Button>
                <Button variant="outline" onClick={() => setShowPlanModal(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
