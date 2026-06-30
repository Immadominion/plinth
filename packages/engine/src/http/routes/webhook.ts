import { Hono } from 'hono';
import { z } from 'zod';
import { verifyNombaSignature } from '../../webhook/sign-payload.js';
import type { TransferReconService } from '../../services/transfer-recon.service.js';
import type { CardTokenizationService } from '../../services/card-token.service.js';
import type { TickService } from '../../services/billing.service.js';
import { env } from '../../config/env.js';

// Real Nomba webhook payload shape
const NombaWebhookSchema = z.object({
  event_type: z.string(),
  requestId:  z.string(),
  data: z.object({
    merchant: z.object({
      userId:        z.string().optional().default(''),
      walletId:      z.string().optional().default(''),
      walletBalance: z.number().optional().default(0),
    }).optional().default({}),
    transaction: z.object({
      type:                  z.string(),
      transactionId:         z.string().optional().default(''),
      transactionAmount:     z.number(),           // kobo (per cert Module 05)
      aliasAccountReference: z.string().optional().default(''),
      responseCode:          z.string().optional().default(''),
      narration:             z.string().optional().default(''),
      sessionId:             z.string().optional().default(''),
      time:                  z.string().optional().default(''),
      orderReference:        z.string().optional().default(''),
    }),
    tokenizedCardData: z.object({
      tokenKey: z.string(),
    }).optional(),
  }),
});

export function makeWebhookRouter(
  reconService: TransferReconService,
  cardTokenService: CardTokenizationService,
  tickService: TickService,
): Hono {
  const router = new Hono();

  // Health/verification endpoint — some providers send a GET to confirm the URL is reachable
  // before enabling webhook delivery. Respond 200 so registration validation passes.
  router.get('/nomba', (c) => c.json({ status: 'ok', endpoint: 'nomba-webhook' }, 200));

  router.post('/nomba', async (c) => {
    const rawBody = await c.req.text();
    const sig     = c.req.header('nomba-signature') ?? '';
    const secret  = env.NOMBA_WEBHOOK_SECRET ?? '';

    // Observability: log every inbound webhook so we can inspect real payload shapes
    console.log('[webhook:nomba] inbound', JSON.stringify({ sig: sig.slice(0, 16), body: rawBody.slice(0, 1000) }));

    // Cert: HMAC-SHA256(rawBody, secret).hex — verify before parsing
    if (sig && secret) {
      if (!verifyNombaSignature(secret, sig, rawBody)) {
        return c.json({ error: 'invalid signature' }, 401);
      }
    }

    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { return c.json({ error: 'invalid json' }, 400); }

    const parsed = NombaWebhookSchema.safeParse(body);
    if (!parsed.success) {
      // Unknown shape — ack and ignore
      return c.json({ received: true }, 200);
    }

    const { event_type, requestId, data } = parsed.data;
    const tx = data.transaction;

    // Virtual account credit — cert: "virtual_account.funded", actual type field: "vact_transfer"
    const isVaCredit = event_type === 'virtual_account.funded' || tx.type === 'vact_transfer';
    if (isVaCredit) {
      // Cert Module 05: amounts are in kobo — transactionAmount is already kobo
      const amountMinor = BigInt(Math.round(tx.transactionAmount));

      await reconService.handleTransfer({
        nombaRequestId: requestId,
        accountRef:     tx.aliasAccountReference,
        amountMinor,
        narration:      tx.narration,
        sessionId:      tx.sessionId,
      });
    }

    // Card tokenized — store token, wire to subscriptions, and activate any incomplete (strict)
    // subscriptions now that the checkout payment has been collected (no second charge).
    if (data.tokenizedCardData?.tokenKey) {
      const linked = await cardTokenService.handleTokenized(
        tx.orderReference,
        data.tokenizedCardData.tokenKey,
      );
      if (linked) {
        await tickService.activateFromPayment(linked.tenantId, linked.customerId);
      }
    }

    return c.json({ received: true }, 200);
  });

  return router;
}
