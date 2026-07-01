import type { ScheduledChangeRepo, ScheduledChange } from '../../src/db/scheduled-change.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemoryScheduledChangeRepo implements ScheduledChangeRepo {
  private store = new Map<string, ScheduledChange>();

  all(): ScheduledChange[] { return [...this.store.values()]; }

  async findBySubscription(_tenantId: string, subscriptionId: string, _tx?: TxContext): Promise<ScheduledChange | null> {
    return [...this.store.values()].find((c) => c.subscriptionId === subscriptionId && (c.applyOn ?? 'period_end') === 'period_end') ?? null;
  }

  async findPendingPaymentBySub(_tenantId: string, subscriptionId: string, _tx?: TxContext): Promise<ScheduledChange | null> {
    return [...this.store.values()].find((c) => c.subscriptionId === subscriptionId && c.applyOn === 'payment') ?? null;
  }

  async create(change: ScheduledChange, _tx?: TxContext): Promise<void> {
    // Upsert by subscriptionId (one pending change per subscription)
    const existing = [...this.store.values()].find((c) => c.subscriptionId === change.subscriptionId);
    if (existing) this.store.delete(existing.id);
    this.store.set(change.id, change);
  }

  async delete(_tenantId: string, id: string, _tx?: TxContext): Promise<void> {
    this.store.delete(id);
  }

  async deleteBySubscription(_tenantId: string, subscriptionId: string, _tx?: TxContext): Promise<void> {
    for (const [id, change] of this.store) {
      if (change.subscriptionId === subscriptionId) this.store.delete(id);
    }
  }
}
