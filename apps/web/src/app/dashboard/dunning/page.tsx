import type { Metadata } from 'next';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_DUNNING } from '@/lib/mock-data';
import { formatKobo, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dunning — Plinth' };

const SOFT_DECLINES = ['INSUFFICIENT_FUNDS', 'TRANSACTION_NOT_PERMITTED', 'EXCEEDS_WITHDRAWAL_LIMIT'];

function getDaysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function GraceDaysBar({ daysRemaining }: { daysRemaining: number }) {
  const maxDays = 7;
  const used = maxDays - daysRemaining;
  const pct = Math.min((used / maxDays) * 100, 100);
  const color = daysRemaining <= 2 ? 'bg-red-500' : daysRemaining <= 5 ? 'bg-orange-400' : 'bg-gray-300';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
        <span>Grace period</span>
        <span className={cn(daysRemaining <= 2 ? 'text-red-500 font-medium' : daysRemaining <= 5 ? 'text-orange-500' : '')}>
          {daysRemaining}d remaining
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DunningPage() {
  const totalAtRisk =
    MOCK_DUNNING.past_due.reduce((s, x) => s + x.amount, 0) +
    MOCK_DUNNING.grace.reduce((s, x) => s + x.amount, 0) +
    MOCK_DUNNING.delinquent.reduce((s, x) => s + x.owed, 0);

  const totalRecovered = MOCK_DUNNING.recovered.reduce((s, x) => s + x.amount, 0);

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
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{formatKobo(totalRecovered)}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-500">recovered this month</span>
          </div>
        </div>

        {/* Kanban columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Past Due */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Past Due ({MOCK_DUNNING.past_due.length})
              </h3>
            </div>
            <div className="space-y-3">
              {MOCK_DUNNING.past_due.map((item) => {
                const isSoft = SOFT_DECLINES.includes(item.declineCode);
                const daysUntil = getDaysUntil(item.nextRetry);
                return (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.customerName}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{item.plan} · {formatKobo(item.amount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded font-mono font-medium',
                        isSoft ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {item.declineCode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Attempt {item.attempts} of 4 · retries in {daysUntil}d
                    </p>
                    <Button variant="outline" size="sm" className="mt-3 w-full text-xs" title="Send customer their VA details to pay by bank transfer">
                      Suggest Transfer
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Grace Period */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                Grace Period ({MOCK_DUNNING.grace.length})
              </h3>
            </div>
            <div className="space-y-3">
              {MOCK_DUNNING.grace.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.customerName}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{item.plan} · {formatKobo(item.amount)}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Entered grace {formatDate(item.enteredGraceAt)}
                  </p>
                  <GraceDaysBar daysRemaining={item.daysRemaining} />
                </Card>
              ))}
            </div>
          </div>

          {/* Delinquent */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Delinquent ({MOCK_DUNNING.delinquent.length})
              </h3>
            </div>
            <div className="space-y-3">
              {MOCK_DUNNING.delinquent.map((item) => (
                <Card key={item.id} className="p-4 border-red-200 dark:border-red-900">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.customerName}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{item.plan}</p>
                  <p className="text-base font-semibold text-red-600 dark:text-red-400">{formatKobo(item.owed)} owed</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    Since {formatDate(item.since)}
                  </p>
                  <Button variant="destructive" size="sm" className="mt-3 w-full text-xs">
                    Write off
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* Recovered */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Recovered ({MOCK_DUNNING.recovered.length})
              </h3>
            </div>
            <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-lg">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {formatKobo(totalRecovered)} recovered this month
              </p>
            </div>
            <div className="space-y-3">
              {MOCK_DUNNING.recovered.map((item) => (
                <Card key={item.id} className="p-4 border-emerald-100 dark:border-emerald-900">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.customerName}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{item.plan}</p>
                  <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{formatKobo(item.amount)}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    on attempt {item.attempt} · {formatDate(item.recoveredAt)}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
