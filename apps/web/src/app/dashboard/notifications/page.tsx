'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Mail, Search } from 'lucide-react';

interface Notification {
  id: string;
  customer_id: string;
  event_type: string | null;
  message: string | null;
  sms_to: string | null;
  sms_status: string | null;
  email_to: string | null;
  email_status: string | null;
  created_at: string;
}

interface Customer { id: string; name: string; email: string }
interface ListResponse<T> { object: 'list'; data: T[] }

const EVENT_LABEL: Record<string, string> = {
  payment_due: 'Payment due',
  past_due:    'Past due',
  delinquent:  'Delinquent',
  recovered:   'Recovered',
  activated:   'Welcome',
  receipt:     'Payment receipt',
  trial_ended: 'Trial ended',
  canceled:    'Canceled',
  reminder:    'Reminder (manual)',
};

function eventLabel(type: string | null): string {
  if (!type) return 'Notification';
  return EVENT_LABEL[type] ?? type;
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'failed', label: 'Failed' },
];

// A channel either wasn't attempted (null → nothing shown), sent, or failed.
function ChannelPill({ icon: Icon, label, status }: { icon: typeof Mail; label: string; status: string | null }) {
  if (!status) return null;
  const ok = status === 'sent';
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        ok
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
      title={`${label}: ${status}`}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [items, setItems] = useState<Notification[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [notifRes, custRes] = await Promise.all([
          api.notifications.list() as Promise<ListResponse<Notification>>,
          (api.customers.list() as Promise<ListResponse<Customer>>).catch(() => null),
        ]);
        if (cancelled) return;
        setItems(notifRes.data ?? []);
        if (custRes?.data) {
          const map: Record<string, string> = {};
          for (const c of custRes.data) map[c.id] = c.name;
          setCustomerNames(map);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const hasFailure = (n: Notification) => n.sms_status === 'failed' || n.email_status === 'failed';
  const isDelivered = (n: Notification) => n.sms_status === 'sent' || n.email_status === 'sent';

  const filtered = items.filter((n) => {
    if (activeTab === 'delivered' && !isDelivered(n)) return false;
    if (activeTab === 'failed' && !hasFailure(n)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (customerNames[n.customer_id] ?? n.customer_id).toLowerCase();
      const msg = (n.message ?? '').toLowerCase();
      const ev = eventLabel(n.event_type).toLowerCase();
      if (!name.includes(q) && !msg.includes(q) && !ev.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Notifications" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Tabs tabs={FILTER_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, event, message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <Card>
          {loading ? (
            <div className="py-16 text-center"><p className="text-sm text-gray-400 dark:text-slate-500">Loading notifications…</p></div>
          ) : error ? (
            <div className="py-16 text-center"><p className="text-sm text-red-500 dark:text-red-400">{error}</p></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare size={28} className="mx-auto text-gray-300 dark:text-slate-700 mb-3" />
              <p className="text-sm text-gray-400 dark:text-slate-500">No notifications yet</p>
              <p className="text-xs text-gray-400 dark:text-slate-600 mt-1">Customer SMS + email sent on billing events will appear here.</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Event</Th>
                  <Th>Channels</Th>
                  <Th>Message</Th>
                  <Th>Sent</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((n) => (
                  <Tr
                    key={n.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                  >
                    <Td className="font-medium text-gray-900 dark:text-slate-100">
                      {customerNames[n.customer_id] ?? (
                        <span className="font-mono text-xs text-gray-500 dark:text-slate-400">{n.customer_id}</span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                        {eventLabel(n.event_type)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <ChannelPill icon={MessageSquare} label="SMS" status={n.sms_status} />
                        <ChannelPill icon={Mail} label="Email" status={n.email_status} />
                        {!n.sms_status && !n.email_status && (
                          <span className="text-xs text-gray-400 dark:text-slate-600">—</span>
                        )}
                      </div>
                    </Td>
                    <Td className="text-gray-500 dark:text-slate-400 max-w-md">
                      {expanded === n.id ? (
                        <div className="space-y-1 whitespace-pre-wrap text-xs">
                          <p className="text-gray-700 dark:text-slate-300">{n.message ?? '—'}</p>
                          <p className="text-gray-400 dark:text-slate-600">
                            {n.sms_to && <>SMS → {n.sms_to} ({n.sms_status}){n.email_to ? '  ·  ' : ''}</>}
                            {n.email_to && <>Email → {n.email_to} ({n.email_status})</>}
                          </p>
                        </div>
                      ) : (
                        <span className="line-clamp-1 text-xs">{n.message ?? '—'}</span>
                      )}
                    </Td>
                    <Td className="text-gray-500 dark:text-slate-400 whitespace-nowrap">{formatDate(n.created_at)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

        {!loading && !error && (
          <p className="text-xs text-gray-400 dark:text-slate-600">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''} · click a row for detail
          </p>
        )}
      </div>
    </div>
  );
}
