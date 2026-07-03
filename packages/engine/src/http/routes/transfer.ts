import { Hono } from 'hono';
import type { TransferPaymentService } from '../../services/transfer-payment.service.js';

export function makeTransferRouter(transferPaymentService: TransferPaymentService): Hono {
  const router = new Hono();

  // GET /v1/subscriptions/:id/transfer-details
  // Lazily provisions the customer's virtual account (first time they go to pay by transfer) and
  // returns the account to send to + the amount owed.
  router.get('/:id/transfer-details', async (c) => {
    const tenantId = c.get('tenantId');
    const r = await transferPaymentService.getInstructions(tenantId, c.req.param('id'));
    return c.json({
      object:           'transfer_instructions',
      subscription_id:  r.subscriptionId,
      amount_due_minor: r.amountDueMinor,
      invoice_id:       r.invoiceId,
      has_open_invoice: r.hasOpenInvoice,
      virtual_account: {
        bank_name:      r.virtualAccount.bankName,
        account_number: r.virtualAccount.accountNumber,
        account_name:   r.virtualAccount.accountName,
        account_ref:    r.virtualAccount.accountRef,
      },
    });
  });

  return router;
}
