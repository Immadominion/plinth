import { describe, it, expect, beforeEach } from 'vitest';
import { TickService, ChargeCardService } from './billing.service.js';
import { PostLedgerEntryService } from './ledger.service.js';
import { FakeNombaAdapter } from '../adapters/nomba.js';
import { FakeUnitOfWork } from '../../test/fakes/fake-unit-of-work.js';
import { InMemorySubscriptionRepo } from '../../test/fakes/in-memory-subscription.repo.js';
import { InMemoryInvoiceRepo } from '../../test/fakes/in-memory-invoice.repo.js';
import { InMemoryEventRepo } from '../../test/fakes/in-memory-event.repo.js';
import { InMemoryPlanRepo } from '../../test/fakes/in-memory-plan.repo.js';
import { InMemoryCustomerRepo } from '../../test/fakes/in-memory-customer.repo.js';
import { InMemoryLedgerRepo } from '../../test/fakes/in-memory-ledger.repo.js';
import { InMemoryScheduledChangeRepo } from '../../test/fakes/in-memory-scheduled-change.repo.js';
import { InMemoryDunningRepo } from '../../test/fakes/in-memory-dunning.repo.js';
import { InMemoryPolicyRepo } from '../../test/fakes/in-memory-policy.repo.js';
import type { Subscription } from '../db/subscription.repo.js';
import type { Plan } from '../db/catalog.repo.js';
import type { Invoice } from '../db/invoice.repo.js';

const TENANT = 'tenant_test';
const CUSTOMER = 'cust_test';
const SUB_ID = 'sub_test';
const PLAN_ID = 'pln_test';
const INVOICE_ID = 'inv_test';
const NOW = new Date('2026-03-01T00:00:00Z');

function makePlan(): Plan {
  return {
    id: PLAN_ID,
    tenantId: TENANT,
    planGroupId: 'pg_test',
    name: 'Test Plan',
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

function makeActiveSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: SUB_ID,
    tenantId: TENANT,
    customerId: CUSTOMER,
    planId: PLAN_ID,
    state: 'active',
    billingMode: 'advance',
    quantity: 1,
    defaultPaymentMethodId: 'tok_test',
    preferredRail: 'card',
    currentPeriodStart: new Date('2026-02-01T00:00:00Z'),
    currentPeriodEnd: NOW,
    nextBillAt: NOW,
    trialEndAt: null,
    pausedAt: null,
    canceledAt: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makePastDueSub(dunningNextRetryAt?: string): Subscription {
  return makeActiveSub({
    state: 'past_due',
    metadata: dunningNextRetryAt ? { dunningNextRetryAt } : {},
  });
}

function makeGraceSub(enteredGraceAt: string): Subscription {
  return makeActiveSub({
    state: 'grace',
    metadata: { enteredGraceAt },
  });
}

function makeOpenInvoice(): Invoice {
  return {
    id: INVOICE_ID,
    tenantId: TENANT,
    customerId: CUSTOMER,
    subscriptionId: SUB_ID,
    state: 'open',
    currency: 'NGN',
    amountDueMinor: 500_000n,
    amountPaidMinor: 0n,
    periodStart: new Date('2026-03-01T00:00:00Z'),
    periodEnd: new Date('2026-04-01T00:00:00Z'),
    dueAt: NOW,
    billingMode: 'advance',
    isReceivable: false,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function buildServices() {
  const nomba = new FakeNombaAdapter();
  const uow = new FakeUnitOfWork();
  const subRepo = new InMemorySubscriptionRepo();
  const invoiceRepo = new InMemoryInvoiceRepo();
  const eventRepo = new InMemoryEventRepo();
  const planRepo = new InMemoryPlanRepo();
  const customerRepo = new InMemoryCustomerRepo();
  const ledgerRepo = new InMemoryLedgerRepo();
  const scheduledChangeRepo = new InMemoryScheduledChangeRepo();
  const dunningRepo = new InMemoryDunningRepo();
  const policyRepo = new InMemoryPolicyRepo();
  const clock = { now: () => NOW };

  customerRepo.seed({
    id: CUSTOMER,
    tenantId: TENANT,
    externalRef: 'ext_001',
    name: 'Test Customer',
    email: 'test@example.com',
    phone: null,
    accountBalanceMinor: 0n,
    createdAt: NOW,
  });

  planRepo.seed(makePlan());

  const chargeCardService = new ChargeCardService(nomba);
  const postLedgerEntry = new PostLedgerEntryService(customerRepo, ledgerRepo, uow, clock);
  const tickService = new TickService(
    subRepo, invoiceRepo, eventRepo, planRepo,
    chargeCardService, postLedgerEntry, scheduledChangeRepo,
    dunningRepo, policyRepo, uow, clock,
  );

  return { nomba, subRepo, invoiceRepo, eventRepo, dunningRepo, tickService };
}

describe('TickService dunning', () => {
  describe('markPastDue via renewOne', () => {
    it('hard decline on renewal → subscription goes straight to grace (not past_due)', async () => {
      const { nomba, subRepo, eventRepo } = buildServices();
      const sub = makeActiveSub();
      subRepo.seed(sub);

      nomba.setNextChargeResult({
        success: false,
        providerReference: 'ref_001',
        providerCode: 'STOLEN_CARD',
        message: 'Stolen card',
      });

      // Tick with the active sub due for billing
      const tickService = buildServices().tickService;
      // Rebuild with the nomba that has the preset result
      const svc = (() => {
        const { nomba: n, subRepo: sr, invoiceRepo: ir, eventRepo: er, dunningRepo: dr, tickService: ts } = buildServices();
        sr.seed(sub);
        n.setNextChargeResult({ success: false, providerReference: 'r', providerCode: 'STOLEN_CARD', message: 'stolen' });
        return { sr, er, ts };
      })();

      await svc.ts.tick(TENANT);

      const updated = svc.sr.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('grace');

      const types = svc.er.all().map((e) => e.type);
      expect(types).toContain('subscription.grace');
      expect(types).not.toContain('subscription.past_due');
    });

    it('soft decline on renewal → subscription goes to past_due with dunningNextRetryAt set', async () => {
      const { nomba, subRepo, eventRepo, tickService } = buildServices();
      const sub = makeActiveSub();
      subRepo.seed(sub);

      nomba.setNextChargeResult({
        success: false,
        providerReference: 'ref_002',
        providerCode: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds',
      });

      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('past_due');
      expect(updated?.metadata['dunningNextRetryAt']).toBeDefined();

      const types = eventRepo.all().map((e) => e.type);
      expect(types).toContain('subscription.past_due');
    });
  });

  describe('tickDunning', () => {
    it('past_due sub retried successfully → state becomes active, recovered=1', async () => {
      const { nomba, subRepo, invoiceRepo, eventRepo, tickService } = buildServices();
      const sub = makePastDueSub('2026-02-28T00:00:00Z'); // retry date in the past
      subRepo.seed(sub);
      invoiceRepo.seed(makeOpenInvoice());

      // charge will succeed (amount < 50M)
      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('active');

      const types = eventRepo.all().map((e) => e.type);
      expect(types).toContain('subscription.recovered');
    });

    it('past_due sub with retry date in future → not retried', async () => {
      const { subRepo, invoiceRepo, eventRepo, tickService } = buildServices();
      const futureRetry = new Date(NOW.getTime() + 86_400_000).toISOString();
      const sub = makePastDueSub(futureRetry);
      subRepo.seed(sub);
      invoiceRepo.seed(makeOpenInvoice());

      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('past_due'); // unchanged
      const types = eventRepo.all().map((e) => e.type);
      expect(types).not.toContain('subscription.recovered');
      expect(types).not.toContain('subscription.dunning_retried');
    });

    it('soft decline on retry → schedules next retry, emits dunning_retried', async () => {
      const { nomba, subRepo, invoiceRepo, eventRepo, tickService } = buildServices();
      const sub = makePastDueSub('2026-02-28T00:00:00Z');
      subRepo.seed(sub);
      invoiceRepo.seed(makeOpenInvoice());

      nomba.setNextChargeResult({
        success: false,
        providerReference: 'ref_003',
        providerCode: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds',
      });

      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('past_due');
      expect(updated?.metadata['dunningNextRetryAt']).toBeDefined();

      const types = eventRepo.all().map((e) => e.type);
      expect(types).toContain('subscription.dunning_retried');
    });

    it('hard decline on retry → advances to grace', async () => {
      const { nomba, subRepo, invoiceRepo, eventRepo, tickService } = buildServices();
      const sub = makePastDueSub('2026-02-28T00:00:00Z');
      subRepo.seed(sub);
      invoiceRepo.seed(makeOpenInvoice());

      nomba.setNextChargeResult({
        success: false,
        providerReference: 'ref_004',
        providerCode: 'LOST_CARD',
        message: 'Lost card',
      });

      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('grace');

      const types = eventRepo.all().map((e) => e.type);
      expect(types).toContain('subscription.grace');
    });

    it('max attempts reached → advances to grace', async () => {
      const { nomba, subRepo, invoiceRepo, dunningRepo, eventRepo, tickService } = buildServices();
      const sub = makePastDueSub('2026-02-28T00:00:00Z');
      subRepo.seed(sub);
      invoiceRepo.seed(makeOpenInvoice());

      // Seed 3 prior attempts so attempt 4 (index 3) triggers max
      for (let i = 0; i < 3; i++) {
        await dunningRepo.create({
          id: `dun_prior_${i}`,
          tenantId: TENANT,
          subscriptionId: SUB_ID,
          invoiceId: INVOICE_ID,
          attemptNumber: i,
          declineCode: 'INSUFFICIENT_FUNDS',
          declineType: 'soft',
          nextRetryAt: null,
          attemptedAt: NOW,
          createdAt: NOW,
        });
      }

      nomba.setNextChargeResult({
        success: false,
        providerReference: 'ref_005',
        providerCode: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds',
      });

      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('grace');

      const types = eventRepo.all().map((e) => e.type);
      expect(types).toContain('subscription.grace');
    });
  });

  describe('tickGrace', () => {
    it('grace sub with expired grace period → delinquent', async () => {
      const { subRepo, eventRepo, tickService } = buildServices();
      // enteredGraceAt 8 days ago, graceDays=7 → expired
      const enteredGraceAt = new Date(NOW.getTime() - 8 * 86_400_000).toISOString();
      const sub = makeGraceSub(enteredGraceAt);
      subRepo.seed(sub);

      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('delinquent');

      const types = eventRepo.all().map((e) => e.type);
      expect(types).toContain('subscription.delinquent');
    });

    it('grace sub within grace period → state unchanged', async () => {
      const { subRepo, eventRepo, tickService } = buildServices();
      // enteredGraceAt 3 days ago, graceDays=7 → still in grace
      const enteredGraceAt = new Date(NOW.getTime() - 3 * 86_400_000).toISOString();
      const sub = makeGraceSub(enteredGraceAt);
      subRepo.seed(sub);

      await tickService.tick(TENANT);

      const updated = subRepo.all().find((s) => s.id === SUB_ID);
      expect(updated?.state).toBe('grace');

      const types = eventRepo.all().map((e) => e.type);
      expect(types).not.toContain('subscription.delinquent');
    });
  });
});
