import type { SubscriptionRepo } from '../db/subscription.repo.js';
import type { PlanRepo } from '../db/catalog.repo.js';
import type { InvoiceRepo } from '../db/invoice.repo.js';
import type { VirtualAccount } from '../db/virtual-account.repo.js';
import type { ProvisionVirtualAccountService } from './virtual-account.service.js';
import { NotFoundError } from '../domain/errors.js';

export interface TransferInstructions {
  subscriptionId: string;
  virtualAccount: VirtualAccount;
  amountDueMinor: string;
  invoiceId: string | null;
  hasOpenInvoice: boolean;
}

/**
 * Payment instructions for the transfer rail. Lazily provisions the customer's virtual account the
 * first time they need to pay by transfer ("almost due / first told to pay with the account"), and
 * returns the account details plus what's owed. If there's an open invoice, that's the amount due;
 * otherwise it's the next renewal amount (a "pay ahead" — reconciliation credits it to balance).
 */
export class TransferPaymentService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly planRepo: PlanRepo,
    private readonly invoiceRepo: InvoiceRepo,
    private readonly provisionVa: ProvisionVirtualAccountService,
  ) {}

  async getInstructions(tenantId: string, subscriptionId: string): Promise<TransferInstructions> {
    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);

    // Lazy, idempotent — the VA is created here on first request if it doesn't exist yet.
    const va = await this.provisionVa.execute({ tenantId, customerId: sub.customerId });

    const invoice = await this.invoiceRepo.findOldestPayable(tenantId, sub.customerId);
    let amountDueMinor: bigint;
    if (invoice) {
      amountDueMinor = invoice.amountDueMinor - invoice.amountPaidMinor;
    } else {
      const plan = await this.planRepo.findById(tenantId, sub.planId);
      amountDueMinor = (plan?.amountMinor ?? 0n) * BigInt(sub.quantity);
    }

    return {
      subscriptionId: sub.id,
      virtualAccount: va,
      amountDueMinor: amountDueMinor.toString(),
      invoiceId: invoice?.id ?? null,
      hasOpenInvoice: !!invoice,
    };
  }
}
