import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../src/db/client.js';
import { DrizzleUnitOfWork } from '../../src/db/unit-of-work.js';
import { DrizzleCustomerRepo as CustomerRepo } from '../../src/db/customer.repo.js';
import { DrizzlePlanGroupRepo as PlanGroupRepo } from '../../src/db/catalog.repo.js';
import { DrizzlePlanRepo as PlanRepo } from '../../src/db/catalog.repo.js';
import { DrizzleSubscriptionRepo as SubscriptionRepo } from '../../src/db/subscription.repo.js';
import { DrizzleEventRepo as EventRepo } from '../../src/db/event.repo.js';
import { DrizzleTenantRepo as TenantRepo } from '../../src/db/tenant.repo.js';
import { DrizzleTenantPolicyRepo } from '../../src/db/policy.repo.js';
import { RealClock } from '../../src/adapters/clock.js';
import { InMemoryJobQueue } from '../../src/adapters/queue.js';
import { CreateCustomerService } from '../../src/services/customer.service.js';
import { CreatePlanGroupService } from '../../src/services/catalog.service.js';
import { CreatePlanService } from '../../src/services/catalog.service.js';
import { CreateSubscriptionService } from '../../src/services/subscription.service.js';
import { RelayOutboxService } from '../../src/services/outbox.service.js';
import { CreateTenantService } from '../../src/services/tenant.service.js';
import {
  tenants, tenantApiKeys, customers, planGroups, plans,
  subscriptions, events,
} from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';

const WEBHOOK_SECRET = 'test-secret-32-chars-exactly-xxx';

describe('Phase 2: outbox atomicity + relay', () => {
  const clock = new RealClock();
  const uow = new DrizzleUnitOfWork();
  const tenantRepo = new TenantRepo();
  const customerRepo = new CustomerRepo();
  const planGroupRepo = new PlanGroupRepo();
  const planRepo = new PlanRepo();
  const subscriptionRepo = new SubscriptionRepo();
  const eventRepo = new EventRepo();
  const policyRepo = new DrizzleTenantPolicyRepo();
  const jobQueue = new InMemoryJobQueue();

  const createTenantSvc = new CreateTenantService(tenantRepo, uow, clock);
  const createCustomerSvc = new CreateCustomerService(customerRepo, uow, clock);
  const createPlanGroupSvc = new CreatePlanGroupService(planGroupRepo, uow, clock);
  const createPlanSvc = new CreatePlanService(planGroupRepo, planRepo, uow, clock);
  const createSubscriptionSvc = new CreateSubscriptionService(
    customerRepo, planRepo, subscriptionRepo, eventRepo, policyRepo, uow, clock,
  );
  const relaySvc = new RelayOutboxService(eventRepo, jobQueue, WEBHOOK_SECRET);

  let tenantId: string;

  beforeEach(async () => {
    const { tenantId: tid } = await createTenantSvc.execute({ name: 'Test Tenant Phase2', mode: 'test' });
    tenantId = tid;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(events).where(eq(events.tenantId, tenantId));
    await db.delete(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    await db.delete(plans).where(eq(plans.tenantId, tenantId));
    await db.delete(planGroups).where(eq(planGroups.tenantId, tenantId));
    await db.delete(customers).where(eq(customers.tenantId, tenantId));
    await db.delete(tenantApiKeys).where(eq(tenantApiKeys.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('subscription.created event is written atomically with subscription creation', async () => {
    // Setup catalog
    const { planGroupId } = await createPlanGroupSvc.execute({ tenantId, name: 'Basic' });
    const { planId } = await createPlanSvc.execute({
      tenantId,
      planGroupId,
      name:            'Monthly ₦5k',
      amountMinor:     500_000n,
      billingInterval: 'month',
      lookupKey:       'monthly_5k',
    });
    const { customerId } = await createCustomerSvc.execute({
      tenantId,
      externalRef: 'user_p2_001',
      name:        'Alice',
      email:       'alice@example.com',
      phone:       null,
    });

    // Create subscription — event must land in the DB in the same tx
    const subResult = await createSubscriptionSvc.execute({
      tenantId,
      customerId,
      planId,
    });

    // Verify subscription exists
    const sub = await subscriptionRepo.findById(tenantId, subResult.subscriptionId);
    expect(sub).not.toBeNull();
    expect(sub!.state).toBe('active');

    // Verify outbox event exists (same tx)
    const pending = await eventRepo.findPendingDelivery(10);
    const subEvent = pending.find(
      (e) => e.type === 'subscription.created' && e.resourceId === subResult.subscriptionId,
    );
    expect(subEvent).toBeDefined();
    expect(subEvent!.tenantId).toBe(tenantId);
  });

  it('relay enqueues signed BullMQ job for each pending outbox event', async () => {
    const { planGroupId } = await createPlanGroupSvc.execute({ tenantId, name: 'Pro' });
    const { planId } = await createPlanSvc.execute({
      tenantId,
      planGroupId,
      name:            'Annual',
      amountMinor:     6_000_000n,
      billingInterval: 'year',
      lookupKey:       'annual',
    });
    const { customerId } = await createCustomerSvc.execute({
      tenantId,
      externalRef: 'user_p2_002',
      name:        'Bob',
      email:       'bob@example.com',
      phone:       null,
    });

    await createSubscriptionSvc.execute({ tenantId, customerId, planId });

    const relayed = await relaySvc.relay();
    expect(relayed).toBeGreaterThanOrEqual(1);

    const jobs = jobQueue.allJobs();
    const deliverJobs = jobs.filter((j) => j.payload.type === 'webhook.deliver');
    expect(deliverJobs.length).toBeGreaterThanOrEqual(1);

    // Verify job has signature header
    const firstJob = deliverJobs[0]!;
    const data = firstJob.payload.data as Record<string, unknown>;
    expect(typeof data['signature']).toBe('string');
    expect((data['signature'] as string).startsWith('t=')).toBe(true);
  });

  it('events are marked delivered after relay — not re-relayed', async () => {
    const { planGroupId } = await createPlanGroupSvc.execute({ tenantId, name: 'Starter' });
    const { planId } = await createPlanSvc.execute({
      tenantId,
      planGroupId,
      name:            'Weekly',
      amountMinor:     100_000n,
      billingInterval: 'week',
      lookupKey:       'weekly',
    });
    const { customerId } = await createCustomerSvc.execute({
      tenantId,
      externalRef: 'user_p2_003',
      name:        'Carol',
      email:       'carol@example.com',
      phone:       null,
    });

    await createSubscriptionSvc.execute({ tenantId, customerId, planId });

    const first = await relaySvc.relay();
    const second = await relaySvc.relay();

    expect(first).toBeGreaterThanOrEqual(1);
    expect(second).toBe(0); // nothing left to relay
  });
});
