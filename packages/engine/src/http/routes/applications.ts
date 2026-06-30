import { Hono } from 'hono';
import type { ApplicationService } from '../../services/application.service.js';

function adminAuth(secret: string | undefined) {
  return async (c: any, next: () => Promise<void>) => {
    if (!secret) return c.json({ error: 'Admin not configured' }, 500);
    const auth = c.req.header('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== secret) return c.json({ error: 'Unauthorized' }, 401);
    await next();
  };
}

export function makeApplicationsPublicRouter(service: ApplicationService): Hono {
  const app = new Hono();

  app.post('/', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.businessName || !body?.email || !body?.contactName) {
      return c.json({ error: 'businessName, email, and contactName are required' }, 400);
    }
    const result = await service.submit({
      businessName: body.businessName,
      email:        body.email,
      rcNumber:     body.rcNumber,
      website:      body.website,
      contactName:  body.contactName,
      description:  body.description,
    });
    return c.json({ object: 'application', ...result, createdAt: result.createdAt.toISOString() }, 201);
  });

  return app;
}

export function makeApplicationsAdminRouter(service: ApplicationService, adminSecret: string | undefined): Hono {
  const app = new Hono();

  app.use('*', adminAuth(adminSecret));

  app.get('/', async (c) => {
    const list = await service.list();
    return c.json({ object: 'list', data: list.map(serialise) });
  });

  app.get('/:id', async (c) => {
    const app_ = await service.getById(c.req.param('id'));
    if (!app_) return c.json({ error: 'Not found' }, 404);
    return c.json(serialise(app_));
  });

  app.post('/:id/approve', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.nombaSubAccountId) {
      return c.json({ error: 'nombaSubAccountId is required' }, 400);
    }
    try {
      const result = await service.approve(c.req.param('id'), { nombaSubAccountId: body.nombaSubAccountId });
      return c.json({ object: 'approval', ...result });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  app.post('/:id/reject', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.reason) {
      return c.json({ error: 'reason is required' }, 400);
    }
    try {
      await service.reject(c.req.param('id'), body.reason);
      return c.json({ object: 'rejection', success: true });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  return app;
}

function serialise(a: any) {
  return {
    id:                a.id,
    businessName:      a.businessName,
    email:             a.email,
    rcNumber:          a.rcNumber,
    website:           a.website,
    contactName:       a.contactName,
    description:       a.description,
    status:            a.status,
    nombaSubAccountId: a.nombaSubAccountId,
    tenantId:          a.tenantId,
    rejectionReason:   a.rejectionReason,
    reviewedAt:        a.reviewedAt?.toISOString() ?? null,
    createdAt:         a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}
