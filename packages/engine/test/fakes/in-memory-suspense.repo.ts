import type { SuspenseRepo, SuspenseItem } from '../../src/db/suspense.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemorySuspenseRepo implements SuspenseRepo {
  private store = new Map<string, SuspenseItem>();

  all(): SuspenseItem[] { return [...this.store.values()]; }

  async findById(id: string): Promise<SuspenseItem | null> {
    return this.store.get(id) ?? null;
  }

  async findUnresolved(tenantId?: string): Promise<SuspenseItem[]> {
    return [...this.store.values()].filter(
      (s) => s.resolvedAt === null && (tenantId === undefined || s.tenantId === tenantId),
    );
  }

  async create(item: SuspenseItem, _tx?: TxContext): Promise<void> {
    this.store.set(item.id, item);
  }

  async resolve(id: string, note: string, now: Date): Promise<void> {
    const item = this.store.get(id);
    if (item) this.store.set(id, { ...item, resolvedAt: now, resolvedNote: note });
  }
}
