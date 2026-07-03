'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { formatKobo, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { MoreHorizontal, Plus, Play, FastForward, Copy, Check, X, CreditCard } from 'lucide-react';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'trialing', label: 'Trialing' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'active', label: 'Active' },
  { id: 'past_due', label: 'Past Due' },
  { id: 'grace', label: 'Grace' },
  { id: 'delinquent', label: 'Delinquent' },
  { id: 'canceled', label: 'Canceled' },
];

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  state: string;
  quantity: number;
  preferred_rail: string;
  current_period_end: string;
  next_bill_at: string;
  trial_end_at: string | null;
  created_at: string;
}
interface Customer { id: string; name: string; email: string }
interface Plan { id: string; name: string; amount_minor: string; interval: string }

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [clockDays, setClockDays] = useState('30');
  const [simNow, setSimNow] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [actionSub, setActionSub] = useState<Subscription | null>(null);

  async function refreshClock() {
    try {
      const c: any = await api.clock.get();
      setSimNow(c?.simulated_now ?? null);
    } catch { /* clock endpoint optional */ }
  }

  async function load() {
    setError('');
    try {
      const [s, c, p] = await Promise.all([
        api.subscriptions.list() as Promise<{ data: Subscription[] }>,
        api.customers.list() as Promise<{ data: Customer[] }>,
        api.plans.list() as Promise<{ data: Plan[] }>,
      ]);
      setSubs(s.data ?? []);
      setCustomers(c.data ?? []);
      setPlans(p.data ?? []);
      refreshClock();
    } catch (err: any) {
      setError(err.message ?? 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const customerById = Object.fromEntries(customers.map((c) => [c.id, c]));
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));

  const filtered = activeTab === 'all' ? subs : subs.filter((s) => s.state === activeTab);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  }

  async function runTick() {
    setBusy(true);
    try {
      const res: any = await api.tick.run();
      flash(`Billing tick ran${res?.renewed != null ? ` — ${res.renewed} renewed` : ''}.`);
      await load();
    } catch (err: any) {
      flash(`Tick failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function advanceClock() {
    const days = Number(clockDays);
    if (!Number.isFinite(days) || days <= 0) { flash('Enter a positive number of days.'); return; }
    setBusy(true);
    try {
      await api.clock.advance(Math.round(days * 24 * 60 * 60));
      flash(`Clock advanced ${days} day${days === 1 ? '' : 's'}. Run a billing tick to charge due subscriptions.`);
      await load();
    } catch (err: any) {
      flash(`Advance failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Subscriptions" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs tabs={FILTER_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="flex items-center gap-2">
            {/* Advance the test clock by a custom number of days */}
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
              <input
                type="number"
                min={1}
                value={clockDays}
                onChange={(e) => setClockDays(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) advanceClock(); }}
                disabled={busy}
                className="w-14 text-sm text-right bg-white dark:bg-slate-900 px-2 py-1.5 outline-none tabular-nums disabled:opacity-60"
                aria-label="Days to advance"
              />
              <span className="text-xs text-gray-400 dark:text-slate-500 pr-2 select-none">days</span>
              <button
                onClick={advanceClock}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border-l border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                <FastForward size={14} /> Advance
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={runTick} disabled={busy}>
              <Play size={14} /> Run billing tick
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} disabled={customers.length === 0 || plans.length === 0}>
              <Plus size={14} /> New subscription
            </Button>
          </div>
        </div>

        {simNow && (
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Simulated time: <span className="font-mono text-gray-600 dark:text-slate-300">{new Date(simNow).toLocaleString()}</span>
          </p>
        )}

        {notice && (
          <div className="text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-lg px-3 py-2">
            {notice}
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Card>
          {loading ? (
            <div className="py-16 text-center"><p className="text-sm text-gray-400 dark:text-slate-500">Loading…</p></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">No subscriptions in this state</p>
              {subs.length === 0 && customers.length > 0 && plans.length > 0 && (
                <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}><Plus size={14} /> Create your first subscription</Button>
              )}
              {(customers.length === 0 || plans.length === 0) && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Add a customer and a plan first.</p>
              )}
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Plan</Th>
                  <Th>Amount</Th>
                  <Th>Rail</Th>
                  <Th>State</Th>
                  <Th>Next Bill</Th>
                  <Th>Created</Th>
                  <Th></Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((sub) => {
                  const cust = customerById[sub.customer_id];
                  const plan = planById[sub.plan_id];
                  const amount = plan ? Number(plan.amount_minor) * sub.quantity : 0;
                  return (
                    <Tr key={sub.id}>
                      <Td>
                        <p className="font-medium text-gray-900 dark:text-slate-100">{cust?.name ?? sub.customer_id}</p>
                        <p className="text-xs font-mono text-gray-400 dark:text-slate-500">{sub.id}</p>
                      </Td>
                      <Td>{plan?.name ?? sub.plan_id}{sub.quantity > 1 && <span className="text-gray-400"> ×{sub.quantity}</span>}</Td>
                      <Td>{formatKobo(amount)}</Td>
                      <Td><Badge status={sub.preferred_rail} /></Td>
                      <Td><Badge status={sub.state} /></Td>
                      <Td className="text-gray-500 dark:text-slate-400">{formatDate(sub.next_bill_at)}</Td>
                      <Td className="text-gray-500 dark:text-slate-400">{formatDate(sub.created_at)}</Td>
                      <Td>
                        <button onClick={() => setActionSub(sub)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                          <MoreHorizontal size={16} />
                        </button>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </Card>

        <p className="text-xs text-gray-400 dark:text-slate-600">
          {filtered.length} subscription{filtered.length !== 1 ? 's' : ''}
          {activeTab !== 'all' && ` in ${activeTab.replace(/_/g, ' ')} state`}
        </p>
      </div>

      {showCreate && (
        <CreateSubscriptionModal
          customers={customers}
          plans={plans}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); flash('Subscription created.'); await load(); }}
        />
      )}

      {actionSub && (
        <SubscriptionActionsModal
          sub={actionSub}
          customer={customerById[actionSub.customer_id]}
          plan={planById[actionSub.plan_id]}
          onClose={() => setActionSub(null)}
          onChanged={async () => { await load(); }}
          flash={flash}
        />
      )}
    </div>
  );
}

function CreateSubscriptionModal({
  customers, plans, onClose, onCreated,
}: {
  customers: Customer[];
  plans: Plan[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [rail, setRail] = useState<'card' | 'transfer' | 'direct_debit'>('card');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (!customerId || !planId) return;
    setSaving(true);
    setErr('');
    try {
      await api.subscriptions.create({ customer_id: customerId, plan_id: planId, quantity, preferred_rail: rail });
      onCreated();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create subscription');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New subscription" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Customer">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
          </Select>
        </Field>
        <Field label="Plan">
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatKobo(Number(p.amount_minor))}/{p.interval}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} />
          </Field>
          <Field label="Payment rail">
            <Select value={rail} onChange={(e) => setRail(e.target.value as any)}>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
              <option value="direct_debit">Direct debit</option>
            </Select>
          </Field>
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving || !customerId || !planId}>
            {saving ? 'Creating…' : 'Create subscription'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SubscriptionActionsModal({
  sub, customer, plan, onClose, onChanged, flash,
}: {
  sub: Subscription;
  customer?: Customer;
  plan?: Plan;
  onClose: () => void;
  onChanged: () => void;
  flash: (m: string) => void;
}) {
  const [checkout, setCheckout] = useState<{ checkoutLink: string; orderReference: string } | null>(null);
  const [working, setWorking] = useState('');
  const [copied, setCopied] = useState(false);
  const amount = plan ? Number(plan.amount_minor) * sub.quantity : 0;

  async function genLink() {
    setWorking('link');
    try {
      const res = await api.subscriptions.checkoutLink(sub.id);
      setCheckout({ checkoutLink: res.checkoutLink, orderReference: res.orderReference });
    } catch (e: any) {
      flash(`Checkout link failed: ${e.message}`);
    } finally {
      setWorking('');
    }
  }

  async function simulate() {
    setWorking('sim');
    try {
      // orderReference convention: plinth_{tenantId}_{customerId}
      const tenantId = typeof window !== 'undefined' ? localStorage.getItem('nomba_tenant_id') ?? '' : '';
      const orderRef = checkout?.orderReference ?? `plinth_${tenantId}_${sub.customer_id}`;
      await api.webhooks.simulatePayment(orderRef, amount);
      flash('Payment simulated — card is now on file. Run a billing tick to charge.');
      onClose();
      onChanged();
    } catch (e: any) {
      flash(`Simulate failed: ${e.message}`);
    } finally {
      setWorking('');
    }
  }

  return (
    <Modal title="Subscription actions" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm">
          <p className="font-medium text-gray-900 dark:text-slate-100">{customer?.name ?? sub.customer_id}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{plan?.name ?? sub.plan_id} · {formatKobo(amount)} · <Badge status={sub.state} /></p>
        </div>

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={genLink} disabled={working === 'link'}>
            <CreditCard size={14} /> {working === 'link' ? 'Generating…' : 'Generate checkout link'}
          </Button>

          {checkout && (
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2">
              <code className="flex-1 text-xs font-mono text-gray-900 dark:text-slate-100 break-all">{checkout.checkoutLink}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(checkout.checkoutLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="shrink-0 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          )}

          <Button variant="secondary" size="sm" className="w-full justify-start" onClick={simulate} disabled={working === 'sim'}>
            <Play size={14} /> {working === 'sim' ? 'Simulating…' : 'Simulate payment (dev)'}
          </Button>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            In fake-Nomba mode, "Simulate payment" tokenizes a test card onto this customer's subscriptions so billing ticks can charge.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
