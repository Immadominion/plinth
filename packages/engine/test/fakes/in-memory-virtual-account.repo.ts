import type { VirtualAccountRepo, VirtualAccount } from '../../src/db/virtual-account.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemoryVirtualAccountRepo implements VirtualAccountRepo {
  private store = new Map<string, VirtualAccount>();

  seed(va: VirtualAccount): void { this.store.set(va.id, va); }
  all(): VirtualAccount[] { return [...this.store.values()]; }

  async findByCustomer(_tenantId: string, customerId: string): Promise<VirtualAccount | null> {
    return [...this.store.values()].find((v) => v.customerId === customerId) ?? null;
  }

  async findByAccountRef(accountRef: string): Promise<VirtualAccount | null> {
    return [...this.store.values()].find((v) => v.accountRef === accountRef) ?? null;
  }

  async create(va: VirtualAccount, _tx?: TxContext): Promise<void> {
    this.store.set(va.id, va);
  }
}
