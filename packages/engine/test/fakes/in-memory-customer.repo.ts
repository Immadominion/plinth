// In-memory CustomerRepoPort for service unit tests. No DB; findForUpdate is a plain read
// (single-threaded test context, so no real locking is needed).
import type { TxContext } from '../../src/db/unit-of-work.js';
import type { Kobo } from '../../src/domain/money.js';
import type { CustomerRepo, Customer } from '../../src/db/customer.repo.js';

export class InMemoryCustomerRepo implements CustomerRepo {
  private readonly byId = new Map<string, Customer>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  seed(customer: Customer): void {
    this.byId.set(this.key(customer.tenantId, customer.id), { ...customer });
  }

  async findById(tenantId: string, id: string): Promise<Customer | null> {
    return this.byId.get(this.key(tenantId, id)) ?? null;
  }

  async findByExternalRef(tenantId: string, externalRef: string): Promise<Customer | null> {
    for (const c of this.byId.values()) {
      if (c.tenantId === tenantId && c.externalRef === externalRef) return c;
    }
    return null;
  }

  async findForUpdate(tenantId: string, id: string, _tx: TxContext): Promise<Customer | null> {
    return this.byId.get(this.key(tenantId, id)) ?? null;
  }

  async create(customer: Customer): Promise<void> {
    this.byId.set(this.key(customer.tenantId, customer.id), { ...customer });
  }

  async updateBalance(
    tenantId: string,
    id: string,
    balanceMinor: Kobo,
    _tx: TxContext,
  ): Promise<void> {
    const c = this.byId.get(this.key(tenantId, id));
    if (c) c.accountBalanceMinor = balanceMinor;
  }
}
