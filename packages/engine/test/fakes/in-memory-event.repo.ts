import type { EventRepo, OutboxEvent } from '../../src/db/event.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemoryEventRepo implements EventRepo {
  private store: OutboxEvent[] = [];
  private delivered = new Set<string>();

  all(): OutboxEvent[] {
    return [...this.store];
  }

  pending(): OutboxEvent[] {
    return this.store.filter((e) => !this.delivered.has(e.id));
  }

  async append(event: OutboxEvent, _tx: TxContext): Promise<void> {
    this.store.push(event);
  }

  async findPendingDelivery(limit: number, _tx?: TxContext): Promise<OutboxEvent[]> {
    return this.pending().slice(0, limit);
  }

  async markDelivered(eventIds: string[], _tx?: TxContext): Promise<void> {
    for (const id of eventIds) {
      this.delivered.add(id);
    }
  }
}
