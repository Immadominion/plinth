import { Hono } from 'hono';
import { z } from 'zod';
import type { NombaAdapter } from '../../adapters/nomba.js';
import type { SubscriptionRepo } from '../../db/subscription.repo.js';
import type { CustomerRepo } from '../../db/customer.repo.js';
import type { PlanRepo } from '../../db/catalog.repo.js';
import { env } from '../../config/env.js';

const CheckoutLinkSchema = z.object({
  callbackUrl: z.string().url().optional(),
});

export function makeCheckoutRouter(
  nomba: NombaAdapter,
  subscriptionRepo: SubscriptionRepo,
  customerRepo: CustomerRepo,
  planRepo: PlanRepo,
): Hono {
  const router = new Hono();

  // POST /v1/subscriptions/:id/checkout-link
  // Returns a Nomba-hosted payment link for the customer to pay with (and tokenize) their card.
  // orderReference encodes tenantId+customerId so the payment_success webhook can link back.
  router.post('/:id/checkout-link', async (c) => {
    const tenantId = c.get('tenantId');
    const subId    = c.req.param('id');

    const sub = await subscriptionRepo.findById(tenantId, subId);
    if (!sub) return c.json({ error: 'subscription_not_found' }, 404);

    const customer = await customerRepo.findById(tenantId, sub.customerId);
    if (!customer) return c.json({ error: 'customer_not_found' }, 404);

    const plan = await planRepo.findById(tenantId, sub.planId);
    if (!plan) return c.json({ error: 'plan_not_found' }, 404);

    const body = CheckoutLinkSchema.safeParse(await c.req.json().catch(() => ({})));
    const callbackUrl = body.success ? (body.data.callbackUrl ?? env.CHECKOUT_CALLBACK_URL ?? 'https://app.useplinth.com/checkout/complete') : 'https://app.useplinth.com/checkout/complete';

    // Convention: plinth_{tenantId}_{customerId} so the webhook can parse it
    const orderReference = `plinth_${tenantId}_${customer.id}`;

    // During a trial, or for arrears billing, the checkout only tokenizes the card (no upfront
    // charge) — the first real charge happens at the period boundary. Otherwise collect period 1.
    const tokenizeOnly = sub.state === 'trialing' || sub.billingMode === 'arrears';
    const amountMinor = tokenizeOnly ? 0n : plan.amountMinor;

    const result = await nomba.createCheckoutOrder({
      amountMinor,
      currency:      plan.currency ?? 'NGN',
      orderReference,
      callbackUrl,
      customerEmail: customer.email,
      customerId:    customer.id,
      tokenizeCard:  true,
    });

    return c.json({
      checkoutLink:   result.checkoutLink,
      orderReference: result.orderReference,
      customerId:     customer.id,
      subscriptionId: sub.id,
    }, 200);
  });

  return router;
}
