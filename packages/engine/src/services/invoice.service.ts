import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { InvoiceRepo } from '../db/invoice.repo.js';
import type { EventRepo } from '../db/event.repo.js';
import { NotFoundError } from '../domain/errors.js';
import { assertInvoiceMutable, assertInvoiceTransition } from '../domain/state-machines/invoice.js';

export class FinalizeInvoiceService {
  constructor(
    private readonly invoiceRepo: InvoiceRepo,
    private readonly eventRepo: EventRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(tenantId: string, invoiceId: string): Promise<void> {
    await this.uow.run(async (tx) => {
      const invoice = await this.invoiceRepo.findForUpdate(tenantId, invoiceId, tx);
      if (!invoice) throw new NotFoundError('Invoice', invoiceId);

      assertInvoiceMutable(invoice.state);
      assertInvoiceTransition(invoice.state, 'open');

      const now = this.clock.now();

      await this.invoiceRepo.update({ ...invoice, state: 'open', updatedAt: now }, tx);

      await this.eventRepo.append({
        id:           `evt_${ulid()}`,
        tenantId,
        type:         'invoice.finalized',
        resourceType: 'invoice',
        resourceId:   invoiceId,
        payload: {
          id:             invoiceId,
          subscriptionId: invoice.subscriptionId,
          state:          'open',
          amountDueMinor: invoice.amountDueMinor.toString(),
        },
        occurredAt: now,
        createdAt:  now,
      }, tx);
    });
  }
}
