import { Hono } from 'hono';
import { createHash, randomBytes } from 'crypto';
import { ulid } from 'ulid';
import type { TenantRepo } from '../../db/tenant.repo.js';
import type { Clock } from '../../adapters/clock.js';

export function makeApiKeysRouter(tenantRepo: TenantRepo, clock: Clock): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const keys = await tenantRepo.listApiKeys(tenantId);
    return c.json({
      object: 'list',
      data: keys.map((k) => ({
        object:     'api_key',
        id:         k.id,
        prefix:     k.keyPrefix,
        mode:       k.mode,
        created_at: k.createdAt.toISOString(),
        revoked_at: k.revokedAt?.toISOString() ?? null,
      })),
    });
  });

  router.post('/', async (c) => {
    const tenantId = c.get('tenantId');
    const body = await c.req.json().catch(() => ({}));
    const mode = body.mode === 'test' ? 'test' : 'live';

    const rawSecret = randomBytes(32).toString('hex');
    const prefix = mode === 'test' ? 'sk_test_' : 'sk_live_';
    const rawApiKey = `${prefix}${rawSecret}`;
    const keyHash = createHash('sha256').update(rawApiKey).digest('hex');
    const keyPrefix = rawApiKey.slice(0, 12);
    const now = clock.now();
    const keyId = `key_${ulid()}`;

    await tenantRepo.createApiKey({
      id: keyId, tenantId, keyPrefix, keyHash, mode, createdAt: now, revokedAt: null,
    });

    return c.json({
      object:     'api_key',
      id:         keyId,
      prefix:     keyPrefix,
      mode,
      api_key:    rawApiKey,
      created_at: now.toISOString(),
    }, 201);
  });

  router.delete('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    await tenantRepo.revokeApiKey(id, tenantId, clock.now());
    return c.json({ object: 'api_key', id, revoked: true });
  });

  return router;
}
