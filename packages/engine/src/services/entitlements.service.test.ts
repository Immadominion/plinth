import { describe, it, expect, beforeEach } from 'vitest';
import { EntitlementsService } from './entitlements.service.js';
import { InMemorySubscriptionRepo } from '../../test/fakes/in-memory-subscription.repo.js';
import { InMemoryPlanRepo } from '../../test/fakes/in-memory-plan.repo.js';
import type { Subscription } from '../db/subscription.repo.js';
import type { Plan } from '../db/catalog.repo.js';

const TENANT = 'tenant_test';
const CUSTOMER = 'cust_test';
const SUB_ID = 'sub_test';
const PLAN_ID = 'pln_test';
const NOW = new Date('2026-03-01T00:00:00Z');

function makePlan(): Plan {
  return {
    id: PLAN_ID,
    tenantId: TENANT,
    planGroupId: 'pg_test',
    name: 'Pro Plan',
    amountMinor: 500_000n,
    currency: 'NGN',
    billingInterval: 'month',
    billingIntervalCount: 1,
    trialPeriodDays: 0,
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeSub(state: Subscription['state']): Subscription {
  return {
    id: SUB_ID,
    tenantId: TENANT,
    customerId: CUSTOMER,
    planId: PLAN_ID,
    state,
    billingMode: 'advance',
    quantity: 1,
    defaultPaymentMethodId: 'tok_test',
    preferredRail: 'card',
    currentPeriodStart: NOW,
    currentPeriodEnd: new Date(NOW.getTime() + 30 * 86_400_000),
    nextBillAt: new Date(NOW.getTime() + 30 * 86_400_000),
    trialEndAt: null,
    pausedAt: null,
    canceledAt: null,
    metadata: {},
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function buildService(sub?: Subscription) {
  const subRepo = new InMemorySubscriptionRepo();
  const planRepo = new InMemoryPlanRepo();

  planRepo.seed(makePlan());
  planRepo.seedEntitlements(PLAN_ID, [
    { feature: 'seats', value: '5' },
    { feature: 'api_calls', value: 'unlimited' },
  ]);

  if (sub) subRepo.seed(sub);

  return new EntitlementsService(subRepo, planRepo);
}

describe('EntitlementsService', () => {
  it('active sub → hasAccess=true, tier=full, features from plan', async () => {
    const svc = buildService(makeSub('active'));
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(true);
    expect(result.tier).toBe('full');
    expect(result.state).toBe('active');
    expect(result.subscriptionId).toBe(SUB_ID);
    expect(result.features).toEqual({ seats: '5', api_calls: 'unlimited' });
  });

  it('trialing sub → hasAccess=true, tier=full', async () => {
    const svc = buildService(makeSub('trialing'));
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(true);
    expect(result.tier).toBe('full');
    expect(result.state).toBe('trialing');
  });

  it('grace sub → hasAccess=true, tier=full (service not cut during grace)', async () => {
    const svc = buildService(makeSub('grace'));
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(true);
    expect(result.tier).toBe('full');
    expect(result.state).toBe('grace');
  });

  it('past_due sub → hasAccess=true (still in dunning, service not cut)', async () => {
    const svc = buildService(makeSub('past_due'));
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(true);
    expect(result.tier).toBe('full');
    expect(result.state).toBe('past_due');
  });

  it('paused sub → hasAccess=false, tier=free', async () => {
    const svc = buildService(makeSub('paused'));
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(false);
    expect(result.tier).toBe('free');
  });

  it('delinquent sub → hasAccess=false, tier=free', async () => {
    const svc = buildService(makeSub('delinquent'));
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(false);
    expect(result.tier).toBe('free');
    expect(result.state).toBe('delinquent');
  });

  it('canceled sub → hasAccess=false, tier=free', async () => {
    const svc = buildService(makeSub('canceled'));
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(false);
    expect(result.tier).toBe('free');
  });

  it('no subscription → hasAccess=false, tier=free, subscriptionId=null', async () => {
    const svc = buildService(); // no sub seeded
    const result = await svc.getForCustomer(TENANT, CUSTOMER);

    expect(result.hasAccess).toBe(false);
    expect(result.tier).toBe('free');
    expect(result.subscriptionId).toBeNull();
    expect(result.state).toBeNull();
    expect(result.features).toEqual({});
  });

  it('getSubscriptionStatus returns correct status for known sub', async () => {
    const svc = buildService(makeSub('active'));
    const result = await svc.getSubscriptionStatus(TENANT, SUB_ID);

    expect(result.hasAccess).toBe(true);
    expect(result.tier).toBe('full');
    expect(result.subscriptionId).toBe(SUB_ID);
    expect(result.features).toEqual({ seats: '5', api_calls: 'unlimited' });
  });

  it('getSubscriptionStatus returns none tier for unknown sub', async () => {
    const svc = buildService();
    const result = await svc.getSubscriptionStatus(TENANT, 'nonexistent');

    expect(result.hasAccess).toBe(false);
    expect(result.tier).toBe('none');
    expect(result.state).toBeNull();
  });
});
