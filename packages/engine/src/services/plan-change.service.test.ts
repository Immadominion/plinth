import { describe, it, expect, beforeEach } from 'vitest';
import { ulid } from 'ulid';
import { PlanChangeService } from './plan-change.service.js';
import { ChargeCardService } from './billing.service.js';
import { PostLedgerEntryService } from './ledger.service.js';
import { InMemorySubscriptionRepo } from '../../test/fakes/in-memory-subscription.repo.js';
import { InMemoryPlanRepo } from '../../test/fakes/in-memory-plan.repo.js';
import { InMemoryInvoiceRepo } from '../../test/fakes/in-memory-invoice.repo.js';
import { InMemoryEventRepo } from '../../test/fakes/in-memory-event.repo.js';
import { InMemoryScheduledChangeRepo } from '../../test/fakes/in-memory-scheduled-change.repo.js';
import { InMemoryPolicyRepo } from '../../test/fakes/in-memory-policy.repo.js';
import { InMemoryCustomerRepo } from '../../test/fakes/in-memory-customer.repo.js';
import { InMemoryLedgerRepo } from '../../test/fakes/in-memory-ledger.repo.js';
import { FakeUnitOfWork } from '../../test/fakes/fake-unit-of-work.js';
import { FakeNombaAdapter } from '../adapters/nomba.js';
import type { Subscription } from '../db/subscription.repo.js';
import type { Plan } from '../db/catalog.repo.js';
import type { Customer } from '../db/customer.repo.js';
import { InvalidRequestError } from '../domain/errors.js';

const TENANT = 'ten_test';
const CUSTOMER_ID = 'cus_test';
const NOW = new Date('2026-06-11T00:00:00Z');
const PERIOD_START = new Date('2026-06-01T00:00:00Z');
const PERIOD_END   = new Date('2026-07-01T00:00:00Z');

const clock = { now: () => NOW };

function makePlan(overrides: Partial<Plan> & { id: string; amountMinor: bigint }): Plan {
  return {
    tenantId:             TENANT,
    planGroupId:          'pg_test',
    name:                 overrides.id,
    currency:             'NGN',
    billingInterval:      'month',
    billingIntervalCount: 1,
    trialPeriodDays:      0,
    active:               true,
    createdAt:            NOW,
    updatedAt:            NOW,
    ...overrides,
  };
}

function makeSub(overrides: Partial<Subscription> & { id: string; planId: string }): Subscription {
  return {
    tenantId:               TENANT,
    customerId:             CUSTOMER_ID,
    state:                  'active',
    quantity:               1,
    defaultPaymentMethodId: 'tok_test',
    preferredRail:          'card',
    currentPeriodStart:     PERIOD_START,
    currentPeriodEnd:       PERIOD_END,
    nextBillAt:             PERIOD_END,
    trialEndAt:             null,
    pausedAt:               null,
    canceledAt:             null,
    metadata:               {},
    createdAt:              NOW,
    updatedAt:              NOW,
    ...overrides,
  };
}

function makeCustomer(): Customer {
  return {
    id:                  CUSTOMER_ID,
    tenantId:            TENANT,
    externalRef:         'ext_001',
    name:                'Test Corp',
    email:               'test@corp.ng',
    phone:               null,
    accountBalanceMinor: 0n,
    createdAt:           NOW,
  };
}

describe('PlanChangeService', () => {
  let subscriptionRepo: InMemorySubscriptionRepo;
  let planRepo: InMemoryPlanRepo;
  let invoiceRepo: InMemoryInvoiceRepo;
  let eventRepo: InMemoryEventRepo;
  let scheduledChangeRepo: InMemoryScheduledChangeRepo;
  let policyRepo: InMemoryPolicyRepo;
  let customerRepo: InMemoryCustomerRepo;
  let ledgerRepo: InMemoryLedgerRepo;
  let uow: FakeUnitOfWork;
  let nomba: FakeNombaAdapter;
  let chargeCardService: ChargeCardService;
  let postLedgerEntry: PostLedgerEntryService;
  let svc: PlanChangeService;

  const oldPlan = makePlan({ id: 'plan_pro',  amountMinor: 500000n, name: 'Pro' });
  const newPlan = makePlan({ id: 'plan_max',  amountMinor: 1200000n, name: 'Max' });
  const lowPlan = makePlan({ id: 'plan_basic', amountMinor: 200000n, name: 'Basic' });

  beforeEach(() => {
    subscriptionRepo = new InMemorySubscriptionRepo();
    planRepo         = new InMemoryPlanRepo();
    invoiceRepo      = new InMemoryInvoiceRepo();
    eventRepo        = new InMemoryEventRepo();
    scheduledChangeRepo = new InMemoryScheduledChangeRepo();
    policyRepo       = new InMemoryPolicyRepo();
    customerRepo     = new InMemoryCustomerRepo();
    ledgerRepo       = new InMemoryLedgerRepo();
    uow              = new FakeUnitOfWork();
    nomba            = new FakeNombaAdapter();
    chargeCardService = new ChargeCardService(nomba);
    postLedgerEntry  = new PostLedgerEntryService(customerRepo, ledgerRepo, uow, clock);

    svc = new PlanChangeService(
      subscriptionRepo, planRepo, invoiceRepo, eventRepo,
      scheduledChangeRepo, policyRepo, chargeCardService, postLedgerEntry, uow, clock,
    );

    planRepo.seed(oldPlan);
    planRepo.seed(newPlan);
    planRepo.seed(lowPlan);
    customerRepo.seed(makeCustomer());
  });

  // ─── 1. previewChange ───────────────────────────────────────────────────────

  it('previewChange returns correct amounts for upgrade', async () => {
    const sub = makeSub({ id: `sub_${ulid()}`, planId: oldPlan.id });
    subscriptionRepo.seed(sub);

    const preview = await svc.previewChange({
      tenantId: TENANT, subscriptionId: sub.id, newPlanId: newPlan.id,
    });

    expect(preview.direction).toBe('upgrade');
    // Pro=500000, Max=1200000, 20 days remaining of 30-day period
    // unusedCredit = 500000 * (20*86400) / (30*86400) = 333333
    // newCharge    = 1200000 * (20*86400) / (30*86400) = 800000
    // net          = 466667
    expect(BigInt(preview.dueNowMinor)).toBe(466667n);
    expect(preview.creditMinor).toBe('0');
    expect(preview.scheduledFor).toBeNull();
  });

  // ─── 2. commitChange upgrade: charge card + create invoice + update plan ────

  it('commitChange upgrade charges card, creates invoice, updates plan, posts ledger entry, emits events', async () => {
    const sub = makeSub({ id: `sub_${ulid()}`, planId: oldPlan.id });
    subscriptionRepo.seed(sub);

    const result = await svc.commitChange({
      tenantId: TENANT, subscriptionId: sub.id, newPlanId: newPlan.id,
    });

    expect(result.strategy).toBe('immediate_prorated');
    expect(result.direction).toBe('upgrade');
    expect(result.invoiceId).toBeTruthy();
    expect(BigInt(result.amountChargedMinor!)).toBe(466667n);
    expect(result.creditAppliedMinor).toBeNull();

    // Invoice created
    const invoices = invoiceRepo.all();
    expect(invoices).toHaveLength(1);
    expect(invoices[0]!.state).toBe('paid');

    // Subscription plan updated
    const updatedSub = subscriptionRepo.all()[0]!;
    expect(updatedSub.planId).toBe(newPlan.id);

    // Ledger entry posted
    expect(ledgerRepo.count()).toBe(1);
    const entries = ledgerRepo.allEntries();
    expect(entries[0]!.type).toBe('payment_received');

    // Events emitted
    const events = eventRepo.all();
    const types = events.map((e) => e.type);
    expect(types).toContain('subscription.upgraded');
    expect(types).toContain('invoice.paid');
  });

  // ─── 3. commitChange downgrade with at_period_end policy: scheduled change ──

  it('commitChange downgrade with at_period_end policy creates scheduled change and event', async () => {
    // default policy: downgradeStrategy = 'at_period_end'
    const sub = makeSub({ id: `sub_${ulid()}`, planId: newPlan.id });
    subscriptionRepo.seed(sub);

    const result = await svc.commitChange({
      tenantId: TENANT, subscriptionId: sub.id, newPlanId: oldPlan.id,
    });

    expect(result.strategy).toBe('at_period_end');
    expect(result.direction).toBe('downgrade');
    expect(result.scheduledFor).toBe(PERIOD_END.toISOString());
    expect(result.invoiceId).toBeNull();
    expect(result.amountChargedMinor).toBeNull();

    // Scheduled change created
    const changes = scheduledChangeRepo.all();
    expect(changes).toHaveLength(1);
    expect(changes[0]!.newPlanId).toBe(oldPlan.id);

    // Event emitted
    const events = eventRepo.all();
    expect(events.some((e) => e.type === 'subscription.plan_change_scheduled')).toBe(true);

    // Subscription not changed yet
    const updatedSub = subscriptionRepo.all()[0]!;
    expect(updatedSub.planId).toBe(newPlan.id);
  });

  // ─── 4. commitChange immediate_credit downgrade ──────────────────────────────

  it('commitChange immediate downgrade posts ledger credit and updates plan', async () => {
    // Override downgrade policy to immediate_credit
    policyRepo.seed({
      tenantId:            TENANT,
      upgradeStrategy:     'immediate_prorated',
      downgradeStrategy:   'immediate_credit',
      changeDuringDunning: 'gate_upgrades',
      cancelPolicy:        'end_of_period',
      graceDays:           7,
      updatedAt:           NOW,
    });

    const sub = makeSub({ id: `sub_${ulid()}`, planId: newPlan.id });
    subscriptionRepo.seed(sub);

    const result = await svc.commitChange({
      tenantId: TENANT, subscriptionId: sub.id, newPlanId: oldPlan.id,
    });

    expect(result.strategy).toBe('immediate_prorated');
    expect(result.direction).toBe('downgrade');
    expect(result.invoiceId).toBeNull();
    expect(result.creditAppliedMinor).toBeTruthy();
    expect(BigInt(result.creditAppliedMinor!)).toBeGreaterThan(0n);

    // Ledger credit posted
    expect(ledgerRepo.count()).toBe(1);
    expect(ledgerRepo.allEntries()[0]!.type).toBe('downgrade_credit');

    // Subscription updated
    const updatedSub = subscriptionRepo.all()[0]!;
    expect(updatedSub.planId).toBe(oldPlan.id);

    // Event
    expect(eventRepo.all().some((e) => e.type === 'subscription.downgraded')).toBe(true);
  });

  // ─── 5. commitChange lateral: updates plan, no money moves ──────────────────

  it('commitChange lateral swap updates plan and emits event with no charges', async () => {
    // Use a plan with DIFFERENT id but SAME price to trigger lateral via net==0.
    // Use a distinct amount (300000n) that is the SAME between old and new plan,
    // built as a fresh lateral pair so the amounts are guaranteed equal.
    const lateralA = makePlan({ id: 'plan_lat_a', amountMinor: 300000n, name: 'LatA' });
    const lateralB = makePlan({ id: 'plan_lat_b', amountMinor: 300000n, name: 'LatB' });
    planRepo.seed(lateralA);
    planRepo.seed(lateralB);

    const subId = `sub_${ulid()}`;
    const sub = makeSub({ id: subId, planId: lateralA.id });
    subscriptionRepo.seed(sub);

    const result = await svc.commitChange({
      tenantId: TENANT, subscriptionId: sub.id, newPlanId: lateralB.id,
    });

    expect(result.direction).toBe('lateral');
    expect(result.invoiceId).toBeNull();
    expect(result.amountChargedMinor).toBeNull();
    expect(result.creditAppliedMinor).toBeNull();
    expect(result.planId).toBe(lateralB.id);

    const updatedSub = subscriptionRepo.all().find((s) => s.id === subId)!;
    expect(updatedSub.planId).toBe(lateralB.id);

    expect(eventRepo.all().some((e) => e.type === 'subscription.plan_changed')).toBe(true);
    expect(ledgerRepo.count()).toBe(0);
  });

  // ─── 6. commitChange trialing: swaps plan, no charge ────────────────────────

  it('commitChange during trial swaps plan without charging', async () => {
    const trialEnd = new Date('2026-06-15T00:00:00Z');
    const sub = makeSub({ id: `sub_${ulid()}`, planId: oldPlan.id, state: 'trialing', trialEndAt: trialEnd });
    subscriptionRepo.seed(sub);

    const result = await svc.commitChange({
      tenantId: TENANT, subscriptionId: sub.id, newPlanId: newPlan.id,
    });

    expect(result.strategy).toBe('at_trial_end');
    expect(result.direction).toBe('lateral');
    expect(result.invoiceId).toBeNull();
    expect(result.amountChargedMinor).toBeNull();
    expect(result.scheduledFor).toBe(trialEnd.toISOString());

    const updatedSub = subscriptionRepo.all()[0]!;
    expect(updatedSub.planId).toBe(newPlan.id);

    expect(invoiceRepo.all()).toHaveLength(0);
    expect(ledgerRepo.count()).toBe(0);
  });

  // ─── 7. commitChange dunning gate ───────────────────────────────────────────

  it('commitChange upgrade while past_due throws error when policy is gate_upgrades', async () => {
    const sub = makeSub({ id: `sub_${ulid()}`, planId: oldPlan.id, state: 'past_due' });
    subscriptionRepo.seed(sub);

    await expect(
      svc.commitChange({ tenantId: TENANT, subscriptionId: sub.id, newPlanId: newPlan.id }),
    ).rejects.toThrow(InvalidRequestError);
  });

  // ─── 8. cancelScheduledChange ────────────────────────────────────────────────

  it('cancelScheduledChange deletes change and emits event', async () => {
    const sub = makeSub({ id: `sub_${ulid()}`, planId: newPlan.id });
    subscriptionRepo.seed(sub);

    // Create a scheduled change first
    const commitResult = await svc.commitChange({
      tenantId: TENANT, subscriptionId: sub.id, newPlanId: oldPlan.id,
    });
    expect(commitResult.strategy).toBe('at_period_end');

    const change = scheduledChangeRepo.all()[0]!;
    const changeId = change.id;

    eventRepo.all(); // clear mental state

    await svc.cancelScheduledChange({
      tenantId: TENANT, subscriptionId: sub.id, changeId,
    });

    // Change deleted
    expect(scheduledChangeRepo.all()).toHaveLength(0);

    // Cancellation event emitted
    const events = eventRepo.all();
    expect(events.some((e) => e.type === 'subscription.plan_change_canceled')).toBe(true);
  });
});
