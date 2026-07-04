'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_EVENTS } from '@/lib/mock-data';
import { formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

function getEventFamilyColor(type: string): string {
  if (type.startsWith('invoice.')) return 'text-emerald-600 dark:text-emerald-400';
  if (type.startsWith('transfer.')) return 'text-blue-600 dark:text-blue-400';
  if (type.includes('past_due') || type.includes('grace')) return 'text-amber-600 dark:text-amber-400';
  if (type.includes('delinquent')) return 'text-red-600 dark:text-red-400';
  if (type.startsWith('subscription.')) return 'text-indigo-600 dark:text-indigo-400';
  return 'text-gray-600 dark:text-slate-400';
}

const MOCK_PAYLOAD: Record<string, object> = {
  evt_01: { type: 'subscription.activated', data: { subscriptionId: 'sub_ada', planId: 'plan_standard', invoiceId: 'inv_01' } },
  evt_02: { type: 'invoice.paid', data: { invoiceId: 'inv_01', amount: 290000, paidAt: '2026-06-15T08:00:01Z' } },
  evt_03: { type: 'invoice.payment_due', data: { invoiceId: 'inv_03', amount: 290000, rail: 'transfer' } },
  evt_04: { type: 'subscription.past_due', data: { subscriptionId: 'sub_bola', declineCode: 'INSUFFICIENT_FUNDS', attempts: 1 } },
  evt_05: { type: 'subscription.grace', data: { subscriptionId: 'sub_emeka', gracePeriodDays: 7 } },
  evt_06: { type: 'subscription.delinquent', data: { subscriptionId: 'sub_ngozi' } },
  evt_07: { type: 'subscription.recovered', data: { subscriptionId: 'sub_chidi', attempt: 2, amount: 1200000 } },
  evt_08: { type: 'subscription.trial_ended', data: { subscriptionId: 'sub_tunde', strategy: 'activate_then_charge' } },
  evt_09: { type: 'invoice.partially_paid', data: { invoiceId: 'inv_04', amountPaid: 100000, amountDue: 1200000 } },
  evt_10: { type: 'subscription.plan_change_scheduled', data: { subscriptionId: 'sub_sch', newPlanId: 'plan_standard' } },
  evt_11: { type: 'subscription.canceled', data: { subscriptionId: 'sub_zainab', reason: 'cancel_at_period_end' } },
  evt_12: { type: 'subscription.renewed', data: { subscriptionId: 'sub_ada', planId: 'plan_standard', amount: 290000 } },
};

export default function EventsPage() {
  const [showUndelivered, setShowUndelivered] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const events = showUndelivered
    ? MOCK_EVENTS.filter((e) => !e.delivered)
    : MOCK_EVENTS;

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Events" subtitle="Outbox delivery log" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUndelivered(!showUndelivered)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
                showUndelivered
                  ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {showUndelivered ? 'All events' : 'Undelivered only'}
            </button>
          </div>
          <button
            onClick={() => setLiveMode(!liveMode)}
            className={cn(
              'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              liveMode
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400'
                : 'border-gray-200 text-gray-600 dark:border-slate-700 dark:text-slate-400',
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', liveMode ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-slate-600')} />
            {liveMode ? 'Live' : 'Paused'}
          </button>
        </div>

        {/* Events list */}
        <Card className="divide-y divide-gray-50 dark:divide-slate-800">
          {events.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">No undelivered events</p>
            </div>
          ) : (
            events.map((evt) => {
              const isExpanded = expanded.has(evt.id);
              const payload = MOCK_PAYLOAD[evt.id];
              return (
                <div key={evt.id}>
                  <div
                    className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 cursor-pointer"
                    onClick={() => toggleExpand(evt.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    )}
                    <code className={cn('text-xs font-mono flex-1 truncate', getEventFamilyColor(evt.type))}>
                      {evt.type}
                    </code>
                    <span className="text-xs font-mono text-gray-400 dark:text-slate-500 shrink-0">
                      {evt.resourceId}
                    </span>
                    <Badge
                      status={evt.delivered ? 'delivered' : 'pending'}
                      label={evt.delivered ? 'delivered' : 'pending'}
                    />
                    <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                      {formatRelativeDate(evt.occurredAt)}
                    </span>
                    {!evt.delivered && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); }}
                        className="shrink-0"
                      >
                        <RefreshCw size={12} />
                        Resend
                      </Button>
                    )}
                  </div>
                  {isExpanded && payload && (
                    <div className="px-4 pb-4 bg-gray-50 dark:bg-slate-800/30">
                      <pre className="text-xs font-mono text-gray-600 dark:text-slate-300 overflow-x-auto p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg">
                        {JSON.stringify(payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Card>

        <p className="text-xs text-gray-400 dark:text-slate-600">
          {events.length} event{events.length !== 1 ? 's' : ''}
          {showUndelivered ? ' undelivered' : ' total'}
        </p>
      </div>
    </div>
  );
}
