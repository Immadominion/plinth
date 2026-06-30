import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CreateTenantService } from '../../services/tenant.service.js';

const CreateTenantSchema = z.object({
  name: z.string().min(2).max(128),
  mode: z.enum(['test', 'live']).default('test'),
});

export function makeTenantsRouter(createTenant: CreateTenantService): Hono {
  const router = new Hono();

  router.post('/', zValidator('json', CreateTenantSchema), async (c) => {
    const body = c.req.valid('json');
    const result = await createTenant.execute({ name: body.name, mode: body.mode });

    return c.json(
      {
        object:     'tenant',
        id:         result.tenantId,
        name:       result.name,
        api_key:    result.rawApiKey,
        key_prefix: result.keyPrefix,
        mode:       result.mode,
        created_at: result.createdAt.toISOString(),
      },
      201,
    );
  });

  return router;
}
