import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { NotificationSettingsRepo } from '../../db/notification-settings.repo.js';
import type { NotificationService } from '../../services/notification.service.js';
import type { Clock } from '../../adapters/clock.js';

const SettingsSchema = z.object({
  sms_enabled:     z.boolean(),
  email_enabled:   z.boolean(),
  brand_override:  z.string().trim().max(60).nullable().optional(),
  disabled_events: z.array(z.string()).default([]),
});

const TestSchema = z.object({
  channel: z.enum(['sms', 'email']),
  to:      z.string().min(3),
});

export function makeNotificationSettingsRouter(
  settingsRepo: NotificationSettingsRepo,
  notificationService: NotificationService,
  clock: Clock,
): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const s = await settingsRepo.get(tenantId);
    return c.json({
      object:          'notification_settings',
      sms_enabled:     s.smsEnabled,
      email_enabled:   s.emailEnabled,
      brand_override:  s.brandOverride,
      disabled_events: s.disabledEvents,
    });
  });

  router.put('/', zValidator('json', SettingsSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');
    await settingsRepo.upsert(
      tenantId,
      {
        smsEnabled:     body.sms_enabled,
        emailEnabled:   body.email_enabled,
        brandOverride:  body.brand_override?.trim() ? body.brand_override.trim() : null,
        disabledEvents: body.disabled_events,
      },
      clock.now(),
    );
    return c.json({ object: 'notification_settings', updated: true });
  });

  router.post('/test', zValidator('json', TestSchema), async (c) => {
    const tenantId = c.get('tenantId');
    const { channel, to } = c.req.valid('json');
    const result = await notificationService.sendTest(tenantId, channel, to);
    return c.json({ object: 'notification_test', ...result }, result.ok ? 200 : 502);
  });

  return router;
}
