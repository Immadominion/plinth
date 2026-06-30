import { ulid } from 'ulid';
import { db } from '../db/client.js';
import { subscriptions } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { DrizzleCardTokenRepo } from '../db/card-token.repo.js';
import type { CustomerRepo } from '../db/customer.repo.js';

/**
 * Handles card tokenization from Nomba payment_success webhooks.
 * orderReference convention: plinth_{tenantId}_{customerId}
 */
export class CardTokenizationService {
  constructor(
    private readonly cardTokenRepo: DrizzleCardTokenRepo,
    private readonly customerRepo: CustomerRepo,
  ) {}

  async handleTokenized(orderReference: string, tokenKey: string): Promise<{ tenantId: string; customerId: string } | null> {
    // Parse tenantId and customerId from: plinth_{tenantId}_{cus_XXXXX}
    const lastUnder = orderReference.lastIndexOf('_cus_');
    if (!orderReference.startsWith('plinth_') || lastUnder === -1) return null;

    const tenantId  = orderReference.slice('plinth_'.length, lastUnder);
    const customerId = orderReference.slice(lastUnder + 1); // includes "cus_..."

    if (!tenantId || !customerId) return null;

    const customer = await this.customerRepo.findById(tenantId, customerId);
    if (!customer) return null;

    const now = new Date();

    await this.cardTokenRepo.upsertByCustomer({
      id:         `ctok_${ulid()}`,
      tenantId,
      customerId,
      tokenKey,
      createdAt:  now,
      updatedAt:  now,
    });

    // Wire token onto all active/trialing/past_due subscriptions for this customer
    await db
      .update(subscriptions)
      .set({ defaultPaymentMethodId: tokenKey, updatedAt: now })
      .where(
        and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.customerId, customerId),
          inArray(subscriptions.state, ['active', 'trialing', 'past_due', 'incomplete']),
        ),
      );

    return { tenantId, customerId };
  }
}
