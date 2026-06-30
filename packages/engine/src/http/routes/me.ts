import { Hono } from 'hono';
import type { TenantRepo } from '../../db/tenant.repo.js';

// Returns the currently-authenticated tenant (resolved from the API key by the auth middleware).
export function makeMeRouter(tenantRepo: TenantRepo): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const tenant = await tenantRepo.findById(tenantId);
    if (!tenant) return c.json({ error: 'not_found' }, 404);
    return c.json({
      object:     'tenant',
      id:         tenant.id,
      name:       tenant.name,
      created_at: tenant.createdAt.toISOString(),
    });
  });

  return router;
}
