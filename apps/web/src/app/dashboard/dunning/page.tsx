'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatKobo, formatDate, cn } from '@/lib/utils';
import { Bell, Check, X } from 'lucide-react';

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  state: string;
  quantity: number;
  preferred_rail: string;
  metadata: Record<string, unknown>;
}
interface Customer { id: string; name: string }
interface Plan { id: string; name: string; amount_minor: string }
interface Notification { id: string; customer_id: string; event_type: string | null; created_at: string }
interface ListResponse<T> { object: 'list'; data: T[] }

type ReminderState = 'idle' | 'sending' | 'sent' | 'failed';

function str(meta: Record<string, unknown>, key: string): string | null {
  const v = meta?.[key];
  return typeof v === 'string' ? v : null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

function GraceDaysBar({ daysRemaining, graceDays }: { daysRemaining: number; graceDays: number }) {
  const used = graceDays - daysRemaining;
  const pct = Math.min(Math.max((used / Math.max(graceDays, 1)) * 100, 0), 100);
  const color = daysRemaining <= 2 ? 'bg-red-500' : daysRemaining <= Math.ceil(graceDays / 2) ? 'bg-orange-400' : 'bg-gray-300';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
        <span>Grace period</span>
        <span className={cn(daysRemaining <= 2 ? 'text-red-500 font-medium' : daysRemaining <= Math.ceil(graceDays / 2) ? 'text-orange-500' : '')}>
          {Math.max(daysRemaining, 0)}d remaining
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DunningPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [recovered, setRecovered] = useState<Notification[]>([]);
  const [graceDays, setGraceDays] = useState(7);
  const [now, setNow] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Record<string, ReminderState>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [subRes, custRes, planRes, notifRes, policyRes, clockRes] = await Promise.all([
          api.subscriptions.list() as Promise<ListResponse<Subscription>>,
          (api.customers.list() as Promise<ListResponse<Customer>>).catch(() => null),
          (api.plans.list() as Promise<ListResponse<Plan>>).catch(() => null),
          (api.notifications.list() as Promise<ListResponse<Notification>>).catch(() => null),
          (api.policy.get() as Promise<{ grace_days?: number }>).catch(() => null),
          (api.clock.get() as Promise<{ simulated_now: string | null }>).catch(() => null),
        ]);
        if (cancelled) return;
        setSubs(subRes.data ?? []);
        if (custRes?.data) { const m: Record<string, string> = {}; for (const c of custRes.data) m[c.id] = c.name; setNames(m); }
        if (planRes?.data) { const m: Record<string, Plan> = {}; for (const p of planRes.data) m[p.id] = p; setPlans(m); }
        if (notifRes?.data) setRecovered(notifRes.data.filter((n) => n.event_type === 'recovered').slice(0, 10));
        if (policyRes?.grace_days != null) setGraceDays(policyRes.grace_days);
        if (clockRes?.simulated_now) setNow(new Date(clockRes.simulated_now));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dunning data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function sendReminder(customerId: string) {
    setReminders((r) => ({ ...r, [customerId]: 'sending' }));
    try {
      const res: any = await api.notifications.remind(customerId);
      setReminders((r) => ({ ...r, [customerId]: res.ok ? 'sent' : 'failed' }));
    } catch {
      setReminders((r) => ({ ...r, [customerId]: 'failed' }));
    }
  }

  const amountOf = (s: Subscription): number => {
    const p = plans[s.plan_id];
    return p ? Number(p.amount_minor) * (s.quantity ?? 1) : 0;
  };
  const planName = (s: Subscription): string => plans[s.plan_id]?.name ?? s.plan_id;

  const pastDue = subs.filter((s) => s.state === 'past_due');
  const grace = subs.filter((s) => s.state === 'grace');
  const delinquent = subs.filter((s) => s.state === 'delinquent');

  const totalAtRisk = [...pastDue, ...grace, ...delinquent].reduce((sum, s) => sum + amountOf(s), 0);

  function ReminderButton({ customerId }: { customerId: string }) {
    const state = reminders[customerId] ?? 'idle';
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full text-xs"
        disabled={state === 'sending'}
        onClick={() => sendReminder(customerId)}
        title="Send this customer a payment reminder by SMS + email"
      >
        {state === 'sending' ? 'Sending…'
          : state === 'sent' ? <><Check size={12} /> Reminder sent</>
          : state === 'failed' ? <><X size={12} /> Failed — retry</>
          : <><Bell size={12} /> Send reminder</>}
      </Button>
    );
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Dunning" subtitle="Recovery board" />

      <div className="p-6 space-y-6">
        {/* Metrics strip */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-lg">
            <span className="text-sm font-semibold text-red-700 dark:text-red-400">{formatKobo(totalAtRisk)}</span>
            <span className="text-xs text-red-600 dark:text-red-500">at risk in dunning</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-lg">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{recovered.length}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-500">recovered recently</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center"><p className="text-sm text-gray-400 dark:text-slate-500">Loading dunning board…</p></div>
        ) : error ? (
          <div className="py-16 text-center"><p className="text-sm text-red-500 dark:text-red-400">{error}</p></div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Past Due */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Past Due ({pastDue.length})</h3>
            </div>
            <div className="space-y-3">
              {pastDue.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-600">Nothing past due</p>}
              {pastDue.map((s) => {
                const decline = str(s.metadata, 'declineCode');
                const nextRetry = str(s.metadata, 'dunningNextRetryAt');
                return (
                  <Card key={s.id} className="p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{names[s.customer_id] ?? s.customer_id}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{planName(s)} · {formatKobo(amountOf(s))}</p>
                    {decline && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">{decline}</span>
                      </div>
                    )}
                    {nextRetry && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Retries in {Math.max(daysBetween(now, new Date(nextRetry)), 0)}d</p>
                    )}
                    <ReminderButton customerId={s.customer_id} />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Grace Period */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">Grace Period ({grace.length})</h3>
            </div>
            <div className="space-y-3">
              {grace.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-600">Nobody in grace</p>}
              {grace.map((s) => {
                const enteredGrace = str(s.metadata, 'enteredGraceAt');
                const daysRemaining = enteredGrace ? graceDays - daysBetween(new Date(enteredGrace), now) : graceDays;
                return (
                  <Card key={s.id} className="p-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{names[s.customer_id] ?? s.customer_id}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{planName(s)} · {formatKobo(amountOf(s))}</p>
                    {enteredGrace && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Entered grace {formatDate(enteredGrace)}</p>}
                    <GraceDaysBar daysRemaining={daysRemaining} graceDays={graceDays} />
                    <ReminderButton customerId={s.customer_id} />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Delinquent */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Delinquent ({delinquent.length})</h3>
            </div>
            <div className="space-y-3">
              {delinquent.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-600">Nobody delinquent</p>}
              {delinquent.map((s) => {
                const since = str(s.metadata, 'enteredDelinquentAt');
                return (
                  <Card key={s.id} className="p-4 border-red-200 dark:border-red-900">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{names[s.customer_id] ?? s.customer_id}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{planName(s)}</p>
                    <p className="text-base font-semibold text-red-600 dark:text-red-400">{formatKobo(amountOf(s))} owed</p>
                    {since && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Since {formatDate(since)}</p>}
                    <ReminderButton customerId={s.customer_id} />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recovered */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Recovered ({recovered.length})</h3>
            </div>
            <div className="space-y-3">
              {recovered.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-600">No recent recoveries</p>}
              {recovered.map((n) => (
                <Card key={n.id} className="p-4 border-emerald-100 dark:border-emerald-900">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{names[n.customer_id] ?? n.customer_id}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Payment recovered</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{formatDate(n.created_at)}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
