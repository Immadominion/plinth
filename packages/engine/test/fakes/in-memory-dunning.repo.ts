import type { DunningAttemptRepo, DunningAttempt } from '../../src/db/dunning.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemoryDunningRepo implements DunningAttemptRepo {
  private store: DunningAttempt[] = [];

  all(): DunningAttempt[] { return [...this.store]; }

  async countBySub(_tenantId: string, subscriptionId: string): Promise<number> {
    return this.store.filter((a) => a.subscriptionId === subscriptionId).length;
  }

  async findLatest(_tenantId: string, subscriptionId: string): Promise<DunningAttempt | null> {
    const attempts = this.store.filter((a) => a.subscriptionId === subscriptionId);
    return attempts.sort((a, b) => b.attemptedAt.getTime() - a.attemptedAt.getTime())[0] ?? null;
  }

  async create(attempt: DunningAttempt, _tx?: TxContext): Promise<void> {
    this.store.push(attempt);
  }
}
