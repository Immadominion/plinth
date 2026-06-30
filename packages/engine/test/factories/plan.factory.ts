import type { PlanGroup, Plan } from '../../src/db/catalog.repo.js';

let seq = 0;

export function makePlanGroup(overrides: Partial<PlanGroup> = {}): PlanGroup {
  const i = ++seq;
  return {
    id:          `pg_test_${i}`,
    tenantId:    'ten_test',
    name:        `Test Plan Group ${i}`,
    description: null,
    createdAt:   new Date('2026-01-01T00:00:00Z'),
    updatedAt:   new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makePlan(overrides: Partial<Plan> = {}): Plan {
  const i = ++seq;
  return {
    id:                   `pln_test_${i}`,
    tenantId:             'ten_test',
    planGroupId:          'pg_test_1',
    name:                 `Test Plan ${i}`,
    amountMinor:          500_000n,  // ₦5,000
    currency:             'NGN',
    billingInterval:      'month',
    billingIntervalCount: 1,
    trialPeriodDays:      0,
    active:               true,
    createdAt:            new Date('2026-01-01T00:00:00Z'),
    updatedAt:            new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}
