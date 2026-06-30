import type { InvoiceRepo, Invoice, InvoiceLineItem } from '../../src/db/invoice.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemoryInvoiceRepo implements InvoiceRepo {
  private store = new Map<string, Invoice>();

  seed(invoice: Invoice): void {
    this.store.set(invoice.id, invoice);
  }

  all(): Invoice[] {
    return [...this.store.values()];
  }

  async findById(_tenantId: string, id: string, _tx?: TxContext): Promise<Invoice | null> {
    return this.store.get(id) ?? null;
  }

  async findForUpdate(_tenantId: string, id: string, _tx: TxContext): Promise<Invoice | null> {
    return this.store.get(id) ?? null;
  }

  async findOldestOpen(tenantId: string, customerId: string, _tx?: TxContext): Promise<Invoice | null> {
    const open = [...this.store.values()]
      .filter(
        (inv) =>
          inv.tenantId === tenantId &&
          inv.customerId === customerId &&
          inv.state === 'open',
      )
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    return open[0] ?? null;
  }

  async findOldestPayable(tenantId: string, customerId: string, _tx?: TxContext): Promise<Invoice | null> {
    const payable = [...this.store.values()]
      .filter((inv) => inv.tenantId === tenantId && inv.customerId === customerId
        && (inv.state === 'open' || inv.state === 'partially_paid'))
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    return payable[0] ?? null;
  }

  async findBySubscription(tenantId: string, subscriptionId: string, _tx?: TxContext): Promise<Invoice[]> {
    return [...this.store.values()]
      .filter((inv) => inv.tenantId === tenantId && inv.subscriptionId === subscriptionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async create(invoice: Invoice, _tx?: TxContext): Promise<void> {
    this.store.set(invoice.id, invoice);
  }

  async update(invoice: Invoice, _tx: TxContext): Promise<void> {
    this.store.set(invoice.id, invoice);
  }

  async createLineItems(_items: InvoiceLineItem[], _tx: TxContext): Promise<void> {
    // line items not tracked by in-memory repo in unit tests
  }
}
