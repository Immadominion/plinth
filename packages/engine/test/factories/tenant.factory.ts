// Tenant test factory — create minimal valid objects for use in tests.
import type { Tenant, TenantApiKey } from '../../src/db/tenant.repo.js';

let seq = 0;

export function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  seq += 1;
  return {
    id: `ten_TEST${String(seq).padStart(4, '0')}`,
    name: `Test Tenant ${seq}`,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeTenantApiKey(overrides: Partial<TenantApiKey> = {}): TenantApiKey {
  seq += 1;
  return {
    id: `key_TEST${String(seq).padStart(4, '0')}`,
    tenantId: `ten_TEST0001`,
    keyPrefix: 'sk_test_ABCD',
    keyHash: 'deadbeef'.repeat(8),
    mode: 'test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    revokedAt: null,
    ...overrides,
  };
}
