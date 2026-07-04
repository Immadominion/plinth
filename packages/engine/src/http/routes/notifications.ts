import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { NotificationLogRepo } from '../../db/notification-log.repo.js';
import type { NotificationService } from '../../services/notification.service.js';

const RemindSchema = z.object({ customer_id: z.string().min(1) });

// Customer-facing notification delivery log (SMS + email), plus manual "send reminder".
export function makeNotificationsRouter(logRepo: NotificationLogRepo, notificationService: NotificationService): Hono {
  const router = new Hono();

  // Manual payment reminder (from the dunning board). Always sends (not deduped).
  router.post('/remind', zValidator('json', RemindSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const { customer_id } = c.req.valid('json');
    const result = await notificationService.manualReminder(tenantId, customer_id);
    return c.json({ object: 'notification_reminder', ...result }, result.ok ? 200 : 502);
  });

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const customerId = c.req.query('customer_id') ?? undefined;
    const limitRaw = Number(c.req.query('limit'));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200;

    const list = await logRepo.list(tenantId, { ...(customerId ? { customerId } : {}), limit });

    return c.json({
      object: 'list',
      data: list.map((n) => ({
        object:       'notification',
        id:           n.id,
        customer_id:  n.customerId,
        event_type:   n.eventType,
        message:      n.message,
        sms_to:       n.smsTo,
        sms_status:   n.smsStatus,
        email_to:     n.emailTo,
        email_status: n.emailStatus,
        created_at:   n.createdAt.toISOString(),
      })),
    });
  });

  return router;
}
