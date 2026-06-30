import { Hono } from 'hono';
import type { InvoiceRepo } from '../../db/invoice.repo.js';

export function makeInvoicesRouter(invoiceRepo: InvoiceRepo): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const list = await invoiceRepo.findAll(tenantId);
    return c.json({
      object: 'list',
      data: list.map((i) => ({
        object:          'invoice',
        id:              i.id,
        customer_id:     i.customerId,
        subscription_id: i.subscriptionId,
        state:           i.state,
        currency:        i.currency,
        amount_due:      i.amountDueMinor.toString(),
        amount_paid:     i.amountPaidMinor.toString(),
        period_start:    i.periodStart.toISOString(),
        period_end:      i.periodEnd.toISOString(),
        due_at:          i.dueAt.toISOString(),
        billing_mode:    i.billingMode,
        closed_at:       i.closedAt?.toISOString() ?? null,
        created_at:      i.createdAt.toISOString(),
      })),
    });
  });

  return router;
}
