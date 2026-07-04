import type { CustomerRepo } from '../db/customer.repo.js';
import type { VirtualAccountRepo } from '../db/virtual-account.repo.js';
import type { SmsAdapter } from '../adapters/sms.js';

function naira(minor: bigint | string): string {
  const n = Number(minor) / 100;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

/**
 * Customer-facing SMS notifications off billing events. Every method resolves the customer's phone,
 * formats a message, and sends via the SMS adapter. Calls NEVER throw — a notification failure must
 * not break a billing tick. Configure a live provider (Twilio) to actually deliver; otherwise the
 * Noop adapter logs what would be sent.
 */
export class NotificationService {
  constructor(
    private readonly customerRepo: CustomerRepo,
    private readonly vaRepo: VirtualAccountRepo,
    private readonly sms: SmsAdapter,
    private readonly brand = 'Plinth',
  ) {}

  private async phone(tenantId: string, customerId: string): Promise<string | null> {
    const c = await this.customerRepo.findById(tenantId, customerId).catch(() => null);
    return c?.phone ?? null;
  }

  private async safeSend(tenantId: string, customerId: string, message: string): Promise<void> {
    try {
      const to = await this.phone(tenantId, customerId);
      if (!to) { console.log(`[notify] no phone for ${customerId} — skipped: ${message}`); return; }
      await this.sms.send(to, message);
    } catch (e) {
      console.warn(`[notify] send failed for ${customerId}:`, e instanceof Error ? e.message : e);
    }
  }

  // Transfer-rail payment due — the flagship: tells the customer their dedicated account + amount.
  async paymentDue(tenantId: string, customerId: string, amountMinor: bigint): Promise<void> {
    const va = await this.vaRepo.findByCustomer(tenantId, customerId).catch(() => null);
    const where = va ? ` to ${va.accountNumber} (${va.bankName})` : '';
    await this.safeSend(tenantId, customerId,
      `${this.brand}: your subscription payment of ${naira(amountMinor)} is due. Transfer${where} to keep your plan active.`);
  }

  async pastDue(tenantId: string, customerId: string): Promise<void> {
    await this.safeSend(tenantId, customerId,
      `${this.brand}: we couldn't collect your subscription payment. Please update your payment to avoid losing access.`);
  }

  async delinquent(tenantId: string, customerId: string): Promise<void> {
    await this.safeSend(tenantId, customerId,
      `${this.brand}: your subscription is now on hold for non-payment. Pay now to restore access.`);
  }

  async recovered(tenantId: string, customerId: string): Promise<void> {
    await this.safeSend(tenantId, customerId,
      `${this.brand}: payment received — your subscription is active again. Thank you!`);
  }
}
