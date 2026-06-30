'use client';
import { useState } from 'react';
import type { Metadata } from 'next';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { MOCK_TRANSFERS } from '@/lib/mock-data';
import { formatKobo } from '@/lib/utils';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function TransfersPage() {
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  function handleResolve(id: string) {
    if (!resolveNote.trim()) return;
    setResolved(prev => new Set([...prev, id]));
    setResolveId(null);
    setResolveNote('');
  }

  const suspenseItems = MOCK_TRANSFERS.suspense.filter((s) => !resolved.has(s.id));

  return (
    <div className="flex flex-col">
      <Topbar title="Transfers" subtitle="VA transfers & reconciliation" />

      <div className="p-6 space-y-6">
        {/* Recent Transfers */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transfers</CardTitle>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Date</Th>
                <Th>Account Ref</Th>
                <Th>Amount</Th>
                <Th>Narration</Th>
                <Th>Outcome</Th>
                <Th>Matched Invoice</Th>
              </tr>
            </Thead>
            <Tbody>
              {MOCK_TRANSFERS.recent.map((t) => (
                <Tr key={t.id}>
                  <Td className="text-gray-500 dark:text-slate-400">{t.date}</Td>
                  <Td className="font-mono text-xs">{t.accountRef}</Td>
                  <Td>{formatKobo(t.amount)}</Td>
                  <Td className="text-gray-500 dark:text-slate-400 text-xs">{t.narration}</Td>
                  <Td>
                    <Badge status={t.outcome} label={t.outcome} />
                  </Td>
                  <Td className="font-mono text-xs text-gray-400 dark:text-slate-500">
                    {t.matchedInvoice ?? '—'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>

        {/* Suspense Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {suspenseItems.length > 0 ? (
                <AlertTriangle size={14} className="text-amber-500" />
              ) : (
                <CheckCircle size={14} className="text-emerald-500" />
              )}
              <CardTitle>
                {suspenseItems.length > 0
                  ? `Suspense Queue — ${suspenseItems.length} unresolved transfer${suspenseItems.length !== 1 ? 's' : ''}`
                  : 'Suspense Queue — All clear'}
              </CardTitle>
            </div>
            {suspenseItems.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Review and resolve manually
              </p>
            )}
          </CardHeader>

          {suspenseItems.length === 0 ? (
            <CardContent>
              <div className="py-8 text-center">
                <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-slate-500">No items in suspense</p>
              </div>
            </CardContent>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Account Ref</Th>
                  <Th>Amount</Th>
                  <Th>Narration</Th>
                  <Th>Reason</Th>
                  <Th>Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {suspenseItems.map((item) => (
                  <>
                    <Tr key={item.id}>
                      <Td className="text-gray-500 dark:text-slate-400">{item.date}</Td>
                      <Td className="font-mono text-xs">{item.accountRef}</Td>
                      <Td>{formatKobo(item.amount)}</Td>
                      <Td className="text-gray-500 dark:text-slate-400 text-xs">{item.narration}</Td>
                      <Td>
                        <span className="text-xs font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                          {item.reason}
                        </span>
                      </Td>
                      <Td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResolveId(resolveId === item.id ? null : item.id)}
                        >
                          Resolve
                        </Button>
                      </Td>
                    </Tr>
                    {resolveId === item.id && (
                      <tr key={`${item.id}-form`}>
                        <td colSpan={6} className="px-4 pb-4 bg-gray-50 dark:bg-slate-800/50">
                          <div className="flex items-center gap-3 pt-3">
                            <Input
                              placeholder="Add resolution note…"
                              value={resolveNote}
                              onChange={(e) => setResolveNote(e.target.value)}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleResolve(item.id)}>
                              Confirm
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setResolveId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
