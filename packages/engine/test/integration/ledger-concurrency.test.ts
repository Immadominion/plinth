/**
 * Phase 1 integration test — the things only a real Postgres transaction can prove:
 *   1. FOR UPDATE serializes concurrent balance mutations (no lost updates)
 *   2. credits/debits applied in any order → balance reconciles
 *   3. balance derivation: cached balance == Σ ledger entries (sumBalance)
 *
 * Requires a real Postgres DB. Run with DATABASE_URL set (see phase0.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildContainer, type Container } from '../../src/http/container.js';
import { db } from '../../src/db/client.js';
import { tenants, customers, ledgerEntries } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { assertLedgerInvariant } from '../../src/domain/ledger-invariants.js';

let container: Container;

const TENANT = 'ten_PH1TEST';
const CUS_CONCURRENT = 'cus_PH1_CONC';
const CUS_MIXED = 'cus_PH1_MIXED';

async function seedCustomer(id: string): Promise<void> {
  await db.insert(customers).values({
    id,
    tenantId: TENANT,
    externalRef: `ext_${id}`,
    name: 'Phase1 Test',
    email: `${id}@example.com`,
    accountBalanceMinor: 0n,
    createdAt: new Date(),
  });
}

beforeAll(async () => {
  container = buildContainer();
  // clean slate
  await db.delete(ledgerEntries).where(eq(ledgerEntries.tenantId, TENANT));
  await db.delete(customers).where(eq(customers.tenantId, TENANT));
  await db.delete(tenants).where(eq(tenants.id, TENANT));
  await db.insert(tenants).values({ id: TENANT, name: 'Phase1 Test Tenant', createdAt: new Date() });
  await seedCustomer(CUS_CONCURRENT);
  await seedCustomer(CUS_MIXED);
});

afterAll(async () => {
  await db.delete(ledgerEntries).where(eq(ledgerEntries.tenantId, TENANT));
  await db.delete(customers).where(eq(customers.tenantId, TENANT));
  await db.delete(tenants).where(eq(tenants.id, TENANT));
  await container.close();
});

describe('Phase 1 — ledger correctness against real Postgres', () => {
  it('FOR UPDATE serializes 25 concurrent credits — no lost updates', async () => {
    const N = 25;
    const STEP = 100000n; // ₦1,000 each

    // Fire all posts concurrently; each opens its own transaction and locks the row.
    await Promise.all(
      Array.from({ length: N }, () =>
        container.postLedgerEntryService.execute({
          tenantId: TENANT,
          customerId: CUS_CONCURRENT,
          type: 'overpayment_credit',
          amountMinor: STEP,
          description: 'concurrent credit',
        }),
      ),
    );

    // Final cached balance must be exactly N × STEP (nothing lost to a race).
    const c = await container.customerRepo.findById(TENANT, CUS_CONCURRENT);
    expect(c!.accountBalanceMinor).toBe(BigInt(N) * STEP);

    // Cache == authoritative sum (derivation).
    const sum = await container.ledgerRepo.sumBalance(TENANT, CUS_CONCURRENT);
    expect(sum).toBe(BigInt(N) * STEP);

    // Serialization proof: the running balances are exactly {STEP, 2·STEP, …, N·STEP} —
    // a contiguous sequence with no duplicates, which a lost update would break.
    const entries = await container.ledgerRepo.listForCustomer(TENANT, CUS_CONCURRENT);
    const runningBalances = entries.map((e) => e.balanceAfterMinor).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const expected = Array.from({ length: N }, (_, i) => BigInt(i + 1) * STEP);
    expect(runningBalances).toEqual(expected);
  });

  it('credits and debits in any order reconcile; cache == Σ entries', async () => {
    const amounts = [500000n, -200000n, 50000n, -100000n, 300000n, -150000n];
    const expected = amounts.reduce((a, b) => a + b, 0n); // 400000n

    // sequential, varied signs — "any order"
    for (const amountMinor of amounts) {
      await container.postLedgerEntryService.execute({
        tenantId: TENANT,
        customerId: CUS_MIXED,
        type: amountMinor >= 0n ? 'overpayment_credit' : 'applied_to_invoice',
        amountMinor,
        description: 'mixed',
      });
    }

    const c = await container.customerRepo.findById(TENANT, CUS_MIXED);
    expect(c!.accountBalanceMinor).toBe(expected);

    const sum = await container.ledgerRepo.sumBalance(TENANT, CUS_MIXED);
    expect(sum).toBe(expected);

    // Full ledger invariant holds against the cache (conservation).
    const entries = await container.ledgerRepo.listForCustomer(TENANT, CUS_MIXED);
    // entries are creation-ordered and sequential here, so continuity holds too
    assertLedgerInvariant(entries, c!.accountBalanceMinor);
  });
});
