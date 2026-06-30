'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatKobo, formatDate } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface Customer {
  id: string;
  external_ref: string;
  name: string;
  email: string;
  phone: string | null;
  balance: string;
  created_at: string;
}

interface ListResponse {
  object?: string;
  data: Customer[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.customers.list() as ListResponse;
      setCustomers(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.external_ref?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Customers" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Add customer
          </Button>
        </div>

        {error && (
          <Card className="p-4 border-red-200 dark:border-red-900/50">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}

        {/* Table */}
        <Card>
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>External Ref</Th>
                <Th>Phone</Th>
                <Th>Balance</Th>
                <Th>Created</Th>
              </tr>
            </Thead>
            <Tbody>
              {loading ? (
                <tr>
                  <Td className="text-center text-gray-400 dark:text-slate-500 py-8">
                    Loading…
                  </Td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <Td className="text-center text-gray-400 dark:text-slate-500 py-8">
                    {customers.length === 0 ? 'No customers yet' : 'No matches'}
                  </Td>
                </tr>
              ) : (
                filtered.map((customer) => {
                  const balance = Number(customer.balance);
                  return (
                    <Tr key={customer.id}>
                      <Td>
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="font-medium text-gray-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {customer.name}
                        </Link>
                        <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">{customer.id}</p>
                      </Td>
                      <Td className="text-gray-500 dark:text-slate-400">{customer.email}</Td>
                      <Td className="font-mono text-xs text-gray-500 dark:text-slate-400">{customer.external_ref}</Td>
                      <Td className="text-gray-500 dark:text-slate-400">{customer.phone || '—'}</Td>
                      <Td>
                        {balance > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            +{formatKobo(balance)}
                          </span>
                        ) : balance < 0 ? (
                          <span className="text-red-500 font-medium">
                            {formatKobo(balance)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </Td>
                      <Td className="text-gray-500 dark:text-slate-400">{formatDate(customer.created_at)}</Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Card>

        {/* Footer */}
        {!loading && (
          <p className="text-xs text-gray-400 dark:text-slate-600">
            {customers.length} customer{customers.length === 1 ? '' : 's'} total
          </p>
        )}
      </div>

      {showForm && (
        <AddCustomerModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function AddCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [externalRefTouched, setExternalRefTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggest an external_ref from the email/name until the user edits it.
  useEffect(() => {
    if (externalRefTouched) return;
    const suggestion = email.includes('@') ? email.split('@')[0] : slugify(name);
    setExternalRef(suggestion);
  }, [email, name, externalRefTouched]);

  const valid =
    name.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    externalRef.trim() !== '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.customers.create({
        external_ref: externalRef.trim(),
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">New Customer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@acme.com" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">External Ref</label>
            <Input
              value={externalRef}
              onChange={(e) => { setExternalRef(e.target.value); setExternalRefTouched(true); }}
              placeholder="your-internal-id"
              required
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Your merchant-side identifier for this customer.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Phone <span className="text-gray-300 dark:text-slate-600">(optional)</span></label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!valid || submitting}>
              {submitting ? 'Creating…' : 'Create customer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
