'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { api } from '@/lib/api';
import { Zap, X, CheckCircle, XCircle, Clock, ExternalLink, Copy, Check, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppStatus = 'pending' | 'approved' | 'rejected';
interface Application {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  rcNumber: string | null;
  website: string | null;
  description: string;
  status: AppStatus;
  nombaSubAccountId: string | null;
  tenantId: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STATUS_TABS: { label: string; value: AppStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

function statusBadge(status: AppStatus) {
  const map: Record<AppStatus, { label: string; className: string }> = {
    pending:  { label: 'Pending',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  };
  const s = map[status];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', s.className)}>
      {s.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TEST_SUB_ACCOUNT_ID = 'f683ffd8-5ed3-41c0-bd9d-dcb1f24f0d22';

export default function AdminTenantsPage() {
  const [tab, setTab] = useState<AppStatus | 'all'>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [approveMode, setApproveMode] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [subAccountId, setSubAccountId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [approvalResult, setApprovalResult] = useState<{ tenantId: string; email: string } | null>(null);
  const [copied, setCopied] = useState<'tenantId' | null>(null);

  useEffect(() => {
    api.adminApplications.list()
      .then((res: any) => setApplications(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSubAccountTaken = applications.some((a) => a.status === 'approved' && a.nombaSubAccountId !== null);

  const filtered = tab === 'all' ? applications : applications.filter((a) => a.status === tab);
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  function openDrawer(app: Application) {
    setSelected(app);
    setApproveMode(false);
    setRejectMode(false);
    setSubAccountId(TEST_SUB_ACCOUNT_ID);
    setRejectReason('');
  }

  async function handleApprove() {
    if (!selected || !subAccountId.trim()) return;
    setSaving(true);
    try {
      const result = await api.adminApplications.approve(selected.id, subAccountId.trim());
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? { ...a, status: 'approved', nombaSubAccountId: subAccountId, tenantId: result.tenantId, reviewedAt: new Date().toISOString() }
            : a,
        ),
      );
      setApprovalResult({ tenantId: result.tenantId, email: selected.email });
      setSelected(null);
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!selected || !rejectReason.trim()) return;
    setSaving(true);
    try {
      await api.adminApplications.reject(selected.id, rejectReason.trim());
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? { ...a, status: 'rejected', rejectionReason: rejectReason, reviewedAt: new Date().toISOString() }
            : a,
        ),
      );
      setSelected(null);
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function copyField(field: 'tenantId', value: string) {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* Approval credentials modal */}
      {approvalResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setApprovalResult(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-3">
                  <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Tenant approved</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">A claim link has been sent to <strong>{approvalResult.email}</strong></p>
              </div>
              <button onClick={() => setApprovalResult(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 mt-1">
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">Tenant ID</p>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2.5">
                <code className="flex-1 text-xs font-mono text-gray-900 dark:text-slate-100 break-all">{approvalResult.tenantId}</code>
                <button
                  onClick={() => copyField('tenantId', approvalResult.tenantId)}
                  className="shrink-0 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {copied === 'tenantId' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
              <Mail size={13} className="shrink-0" />
              Claim link emailed to <strong>{approvalResult.email}</strong> — they'll create their API key after logging in
            </div>

            <Button onClick={() => setApprovalResult(null)} className="w-full">Done</Button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-700 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Tenant Applications</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Super Admin Console</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">← System overview</Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending review', value: pendingCount, icon: <Clock size={16} className="text-amber-500" /> },
          { label: 'Approved', value: applications.filter((a) => a.status === 'approved').length, icon: <CheckCircle size={16} className="text-emerald-500" /> },
          { label: 'Rejected', value: applications.filter((a) => a.status === 'rejected').length, icon: <XCircle size={16} className="text-red-500" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 flex items-center gap-3">
              {icon}
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {STATUS_TABS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    tab === value
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800',
                  )}
                >
                  {label}
                  {value === 'pending' && pendingCount > 0 && (
                    <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-xs', tab === 'pending' ? 'bg-white/20' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300')}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Business</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th>Applied</Th>
              <Th>Nomba Sub-Account</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={6} className="text-center py-10 text-gray-400 dark:text-slate-500">
                  Loading…
                </Td>
              </Tr>
            ) : filtered.length === 0 ? (
              <Tr>
                <Td colSpan={6} className="text-center py-10 text-gray-400 dark:text-slate-500">
                  No applications in this category
                </Td>
              </Tr>
            ) : (
              filtered.map((app) => (
                <Tr key={app.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50" onClick={() => openDrawer(app)}>
                  <Td>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{app.businessName}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{app.email}</p>
                  </Td>
                  <Td>{app.contactName}</Td>
                  <Td>{statusBadge(app.status)}</Td>
                  <Td className="text-xs text-gray-500 dark:text-slate-400">{formatDate(app.createdAt)}</Td>
                  <Td>
                    {app.nombaSubAccountId ? (
                      <code className="text-xs font-mono text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {app.nombaSubAccountId}
                      </code>
                    ) : (
                      <span className="text-gray-300 dark:text-slate-600">—</span>
                    )}
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDrawer(app)}>Review</Button>
                      {app.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { openDrawer(app); setApproveMode(true); }}
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>

      {/* Detail drawer / modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />

          {/* Drawer panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-slate-100">{selected.businessName}</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">{selected.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(selected.status)}
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 ml-2">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Applicant details */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Applicant</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Contact name', value: selected.contactName },
                    { label: 'Email', value: selected.email },
                    { label: 'RC number', value: selected.rcNumber ?? '—' },
                    { label: 'Website', value: selected.website ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 break-all">
                        {label === 'Website' && selected.website ? (
                          <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                            {selected.website} <ExternalLink size={10} />
                          </a>
                        ) : value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Description */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">What they're building</h3>
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-3">
                  {selected.description ?? <span className="text-gray-400 italic">No description provided</span>}
                </p>
              </section>

              {/* Timeline */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Applied</span>
                    <span className="text-gray-900 dark:text-slate-100">{formatDate(selected.createdAt)}</span>
                  </div>
                  {selected.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Reviewed</span>
                      <span className="text-gray-900 dark:text-slate-100">{formatDate(selected.reviewedAt)}</span>
                    </div>
                  )}
                  {selected.tenantId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Tenant ID</span>
                      <code className="text-xs font-mono text-gray-900 dark:text-slate-100">{selected.tenantId}</code>
                    </div>
                  )}
                  {selected.nombaSubAccountId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Nomba Sub-Account</span>
                      <code className="text-xs font-mono text-gray-900 dark:text-slate-100">{selected.nombaSubAccountId}</code>
                    </div>
                  )}
                  {selected.rejectionReason && (
                    <div className="mt-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Rejection reason</p>
                      <p className="text-xs text-red-700 dark:text-red-300">{selected.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Approve form */}
              {selected.status === 'pending' && approveMode && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Approve</h3>
                  {isSubAccountTaken ? (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-4 text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-medium mb-1">Sub-account unavailable</p>
                      <p className="text-xs leading-relaxed">Only one Nomba sub-account is available for this build. It is currently assigned to an approved tenant and cannot be reassigned until that approval is removed.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">Nomba sub-account ID</label>
                        <Input value={subAccountId} readOnly className="font-mono text-xs bg-gray-50 dark:bg-slate-800 cursor-default" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleApprove} disabled={saving} className="flex-1">
                          {saving ? 'Approving…' : 'Confirm approval →'}
                        </Button>
                        <Button variant="outline" onClick={() => setApproveMode(false)}>Cancel</Button>
                      </div>
                    </>
                  )}
                  {isSubAccountTaken && (
                    <Button variant="outline" onClick={() => setApproveMode(false)} className="w-full">Close</Button>
                  )}
                </section>
              )}

              {/* Reject form */}
              {selected.status === 'pending' && rejectMode && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Reject application</h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1.5">Reason (will be sent to applicant)</label>
                    <textarea
                      rows={3}
                      placeholder="E.g. Insufficient business information. Please provide a valid RC number."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || saving}
                      variant="destructive"
                      className="flex-1"
                    >
                      {saving ? 'Rejecting…' : 'Confirm rejection'}
                    </Button>
                    <Button variant="outline" onClick={() => setRejectMode(false)}>Cancel</Button>
                  </div>
                </section>
              )}
            </div>

            {/* Drawer footer actions for pending */}
            {selected.status === 'pending' && !approveMode && !rejectMode && (
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-6 py-4 flex gap-3">
                <Button
                  onClick={() => setApproveMode(true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle size={14} className="mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectMode(true)}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                >
                  <XCircle size={14} className="mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
