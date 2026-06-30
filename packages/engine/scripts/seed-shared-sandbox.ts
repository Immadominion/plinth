/**
 * Seeds the shared docs sandbox tenant with a fixed, known API key.
 * Run once on deploy: pnpm tsx scripts/seed-shared-sandbox.ts
 *
 * Requires DOCS_SHARED_API_KEY env var — this becomes the key printed in
 * all documentation examples. Set it to something memorable like:
 *   sk_test_DOCS_SHARED_KEY
 * or a real random value stored in your secrets manager.
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { tenants, tenantApiKeys, planGroups, plans, customers } from '../src/db/schema.js';
import { ulid } from 'ulid';

const SHARED_KEY = process.env['DOCS_SHARED_API_KEY'];
if (!SHARED_KEY) {
  console.error('DOCS_SHARED_API_KEY env var is required');
  process.exit(1);
}
if (!SHARED_KEY.startsWith('sk_test_')) {
  console.error('DOCS_SHARED_API_KEY must start with sk_test_');
  process.exit(1);
}

const TENANT_NAME = 'Docs Shared Sandbox';
const keyHash = createHash('sha256').update(SHARED_KEY).digest('hex');

async function run() {
  // Idempotent — skip if this key already exists
  const existing = await db
    .select()
    .from(tenantApiKeys)
    .where(eq(tenantApiKeys.keyHash, keyHash));

  if (existing.length > 0) {
    console.log('Shared sandbox already seeded. Skipping.');
    process.exit(0);
  }

  const now = new Date();
  const tenantId = `ten_shared_${ulid()}`;

  await db.transaction(async (tx) => {
    await tx.insert(tenants).values({
      id:        tenantId,
      name:      TENANT_NAME,
      createdAt: now,
      expiresAt: null, // shared sandbox never expires
    });

    await tx.insert(tenantApiKeys).values({
      id:        `key_${ulid()}`,
      tenantId,
      keyPrefix: SHARED_KEY.slice(0, 12),
      keyHash,
      mode:      'test',
      createdAt: now,
      revokedAt: null,
    });

    const pgId = `pg_${ulid()}`;
    await tx.insert(planGroups).values({
      id: pgId, tenantId, name: 'Core', description: null, createdAt: now, updatedAt: now,
    });

    await tx.insert(plans).values([
      {
        id: `pln_${ulid()}`, tenantId, planGroupId: pgId,
        name: 'Starter', amountMinor: 200000n, currency: 'NGN',
        billingInterval: 'month', billingIntervalCount: 1,
        trialPeriodDays: 0, active: true, createdAt: now, updatedAt: now,
      },
      {
        id: `pln_${ulid()}`, tenantId, planGroupId: pgId,
        name: 'Pro', amountMinor: 500000n, currency: 'NGN',
        billingInterval: 'month', billingIntervalCount: 1,
        trialPeriodDays: 0, active: true, createdAt: now, updatedAt: now,
      },
      {
        id: `pln_${ulid()}`, tenantId, planGroupId: pgId,
        name: 'Max', amountMinor: 1200000n, currency: 'NGN',
        billingInterval: 'month', billingIntervalCount: 1,
        trialPeriodDays: 0, active: true, createdAt: now, updatedAt: now,
      },
    ]);

    await tx.insert(customers).values({
      id:                  `cus_${ulid()}`,
      tenantId,
      externalRef:         'docs_customer_001',
      name:                'Docs Test Customer',
      email:               'customer@docs-sandbox.ng',
      phone:               null,
      accountBalanceMinor: 0n,
      createdAt:           now,
    });
  });

  console.log(`Shared sandbox seeded successfully.`);
  console.log(`  Tenant ID : ${tenantId}`);
  console.log(`  API key   : ${SHARED_KEY}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
