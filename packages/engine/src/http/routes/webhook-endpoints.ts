import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { WebhookEndpointService } from '../../services/webhook-endpoint.service.js';
import type { DrizzleWebhookDeliveryRepo, WebhookDelivery } from '../../db/webhook-delivery.repo.js';
import type { WebhookEndpoint } from '../../db/webhook-endpoint.repo.js';

const CreateSchema = z.object({
  url:         z.string().url(),
  description: z.string().max(200).optional(),
  event_types: z.array(z.string()).optional(),
});

const UpdateSchema = z.object({
  url:         z.string().url().optional(),
  description: z.string().max(200).optional(),
  enabled:     z.boolean().optional(),
  event_types: z.array(z.string()).optional(),
});

// The secret is only returned on create/rotate (like an API key). Normal reads omit it.
function serialize(e: WebhookEndpoint, opts?: { withSecret?: boolean }) {
  return {
    object:      'webhook_endpoint',
    id:          e.id,
    url:         e.url,
    description: e.description,
    enabled:     e.enabled,
    event_types: e.eventTypes,
    ...(opts?.withSecret ? { secret: e.secret } : {}),
    created_at:  e.createdAt.toISOString(),
    updated_at:  e.updatedAt.toISOString(),
  };
}

function serializeDelivery(d: WebhookDelivery) {
  return {
    object:          'webhook_delivery',
    id:              d.id,
    endpoint_id:     d.endpointId,
    event_id:        d.eventId,
    event_type:      d.eventType,
    status:          d.status,
    attempts:        d.attempts,
    response_code:   d.responseCode,
    error:           d.error,
    next_retry_at:   d.nextRetryAt?.toISOString() ?? null,
    last_attempt_at: d.lastAttemptAt?.toISOString() ?? null,
    created_at:      d.createdAt.toISOString(),
  };
}

export function makeWebhookEndpointsRouter(
  service: WebhookEndpointService,
  deliveryRepo: DrizzleWebhookDeliveryRepo,
): Hono {
  const router = new Hono();

  router.post('/', zValidator('json', CreateSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const b = c.req.valid('json');
    const e = await service.create(tenantId, { url: b.url, description: b.description, eventTypes: b.event_types });
    return c.json(serialize(e, { withSecret: true }), 201); // secret shown once
  });

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const list = await service.list(tenantId);
    return c.json({ object: 'list', data: list.map((e) => serialize(e)) });
  });

  router.get('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    return c.json(serialize(await service.get(tenantId, c.req.param('id'))));
  });

  router.patch('/:id', zValidator('json', UpdateSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const b = c.req.valid('json');
    const e = await service.update(tenantId, c.req.param('id'), {
      url: b.url, description: b.description, enabled: b.enabled, eventTypes: b.event_types,
    });
    return c.json(serialize(e));
  });

  router.post('/:id/rotate-secret', async (c) => {
    const tenantId = c.get('tenantId');
    const e = await service.rotateSecret(tenantId, c.req.param('id'));
    return c.json(serialize(e, { withSecret: true }));
  });

  router.delete('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    await service.delete(tenantId, c.req.param('id'));
    return c.json({ object: 'webhook_endpoint', id: c.req.param('id'), deleted: true });
  });

  // Recent deliveries for an endpoint (dashboard observability) + status counts.
  router.get('/:id/deliveries', async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    await service.get(tenantId, id); // 404 if endpoint missing
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);
    const [deliveries, counts] = await Promise.all([
      deliveryRepo.listByEndpoint(tenantId, id, limit),
      deliveryRepo.countByStatusForEndpoint(tenantId, id),
    ]);
    return c.json({ object: 'list', counts, data: deliveries.map(serializeDelivery) });
  });

  // Manually re-attempt a delivery (e.g. after the endpoint was fixed).
  router.post('/:id/deliveries/:deliveryId/resend', async (c) => {
    const tenantId = c.get('tenantId');
    await service.get(tenantId, c.req.param('id'));
    const delivery = await deliveryRepo.findById(tenantId, c.req.param('deliveryId'));
    if (!delivery) return c.json({ error: 'delivery_not_found' }, 404);
    await deliveryRepo.requeue(delivery.id, new Date());
    return c.json({ object: 'webhook_delivery', id: delivery.id, requeued: true });
  });

  return router;
}
