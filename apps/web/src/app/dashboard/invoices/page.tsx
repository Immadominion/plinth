'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatKobo, formatDate } from '@/lib/utils';
import { Download } from 'lucide-react';

interface Invoice {
  id: string;
  customer_id: string;
  subscription_id: string;
  state: string;
  currency: string;
  amount_due: string;
  amount_paid: string;
  period_start: string | null;
  period_end: string | null;
  due_at: string | null;
  billing_mode: string;
  closed_at: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface ListResponse<T> {
  object: 'list';
  data: T[];
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'paid', label: 'Paid' },
  { id: 'void', label: 'Void' },
  { id: 'uncollectible', label: 'Uncollectible' },
];

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start && end) return `${formatDate(start)} → ${formatDate(end)}`;
  return formatDate((start ?? end) as string);
}

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [invRes, custRes] = await Promise.all([
          api.invoices.list() as Promise<ListResponse<Invoice>>,
          (api.customers.list() as Promise<ListResponse<Customer>>).catch(() => null),
        ]);
        if (cancelled) return;
        setInvoices(invRes.data ?? []);
        if (custRes?.data) {
          const map: Record<string, string> = {};
          for (const c of custRes.data) map[c.id] = c.name;
          setCustomerNames(map);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load invoices');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = activeTab === 'all'
    ? invoices
    : invoices.filter((i) => i.state === activeTab);

  return (
    <div className="flex flex-col">
      <Topbar title="Invoices" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Tabs tabs={FILTER_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Feature coming soon')}
          >
            <Download size={14} />
            Export CSV
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">Loading invoices…</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">No invoices in this state</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Invoice ID</Th>
                  <Th>Customer</Th>
                  <Th>Amount</Th>
                  <Th>Mode</Th>
                  <Th>Period</Th>
                  <Th>State</Th>
                  <Th>Due</Th>
                  <Th>Closed</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((inv) => (
                  <Tr key={inv.id}>
                    <Td>
                      <span className="font-mono text-xs text-gray-600 dark:text-slate-400">{inv.id}</span>
                    </Td>
                    <Td className="font-medium text-gray-900 dark:text-slate-100">
                      {customerNames[inv.customer_id] ?? (
                        <span className="font-mono text-xs text-gray-500 dark:text-slate-400">{inv.customer_id}</span>
                      )}
                    </Td>
                    <Td>{formatKobo(Number(inv.amount_due))}</Td>
                    <Td>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        inv.billing_mode === 'advance'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {inv.billing_mode}
                      </span>
                    </Td>
                    <Td className="text-gray-500 dark:text-slate-400">{formatPeriod(inv.period_start, inv.period_end)}</Td>
                    <Td><Badge status={inv.state} /></Td>
                    <Td className="text-gray-500 dark:text-slate-400">{inv.due_at ? formatDate(inv.due_at) : '—'}</Td>
                    <Td className="text-gray-500 dark:text-slate-400">{inv.closed_at ? formatDate(inv.closed_at) : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

        {!loading && !error && (
          <p className="text-xs text-gray-400 dark:text-slate-600">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
