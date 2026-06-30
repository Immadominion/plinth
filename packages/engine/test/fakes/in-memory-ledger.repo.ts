// In-memory LedgerRepoPort for service unit tests. Append-only list; sumBalance and
// listForCustomer operate over the in-memory entries.
import { ZERO, type Kobo } from '../../src/domain/money.js';
import type { LedgerRepo } from '../../src/db/ledger.repo.js';
import type { LedgerEntry } from '../../src/domain/ledger-types.js';

export class InMemoryLedgerRepo implements LedgerRepo {
  private readonly entries: LedgerEntry[] = [];

  async append(entry: LedgerEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async sumBalance(tenantId: string, customerId: string): Promise<Kobo> {
    return this.entries
      .filter((e) => e.tenantId === tenantId && e.customerId === customerId)
      .reduce<Kobo>((acc, e) => acc + e.amountMinor, ZERO);
  }

  async listForCustomer(tenantId: string, customerId: string): Promise<LedgerEntry[]> {
    return this.entries
      .filter((e) => e.tenantId === tenantId && e.customerId === customerId)
      .map((e) => ({ ...e }));
  }

  /** Test helper — total entry count across all customers. */
  count(): number {
    return this.entries.length;
  }

  /** Test helper — all entries across all customers. */
  allEntries(): LedgerEntry[] {
    return [...this.entries];
  }
}
