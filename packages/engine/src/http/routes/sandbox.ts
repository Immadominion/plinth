import { Hono } from 'hono';
import type { SandboxService } from '../../services/sandbox.service.js';

export function makeSandboxRouter(sandboxService: SandboxService): Hono {
  const router = new Hono();

  router.post('/create', async (c) => {
    const result = await sandboxService.create();

    return c.json({
      object:     'sandbox',
      tenant_id:  result.tenantId,
      api_key:    result.apiKey,
      expires_at: result.expiresAt,
      plans:      result.plans.map((p) => ({
        id:           p.id,
        name:         p.name,
        amount_minor: p.amountMinor,
        currency:     'NGN',
        interval:     'month',
      })),
      customer: {
        id:    result.customer.id,
        name:  result.customer.name,
        email: result.customer.email,
      },
    }, 201);
  });

  return router;
}
