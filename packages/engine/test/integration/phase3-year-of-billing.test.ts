import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../src/db/client.js';
import { DrizzleUnitOfWork } from '../../src/db/unit-of-work.js';
import { DrizzleCustomerRepo as CustomerRepo } from '../../src/db/customer.repo.js';
import { DrizzleLedgerRepo as LedgerRepo } from '../../src/db/ledger.repo.js';
import { DrizzlePlanGroupRepo as PlanGroupRepo } from '../../src/db/catalog.repo.js';
import { DrizzlePlanRepo as PlanRepo } from '../../src/db/catalog.repo.js';
import { DrizzleSubscriptionRepo as SubscriptionRepo } from '../../src/db/subscription.repo.js';
import { DrizzleInvoiceRepo as InvoiceRepo } from '../../src/db/invoice.repo.js';
import { DrizzleEventRepo as EventRepo } from '../../src/db/event.repo.js';
import { DrizzleTenantRepo as TenantRepo } from '../../src/db/tenant.repo.js';
import { RealClock } from '../../src/adapters/clock.js';
import { FakeNombaAdapter } from '../../src/adapters/nomba.js';
import { CreateTenantService } from '../../src/services/tenant.service.js';
import { CreateCustomerService } from '../../src/services/customer.service.js';
import { CreatePlanGroupService, CreatePlanService } from '../../src/services/catalog.service.js';
import { CreateSubscriptionService } from '../../src/services/subscription.service.js';
import { PostLedgerEntryService } from '../../src/services/ledger.service.js';
import { ChargeCardService, TickService } from '../../src/services/billing.service.js';
import { DrizzleScheduledChangeRepo as ScheduledChangeRepo } from '../../src/db/scheduled-change.repo.js';
import { DrizzleDunningAttemptRepo as DunningAttemptRepo } from '../../src/db/dunning.repo.js';
import { DrizzleTenantPolicyRepo as TenantPolicyRepo } from '../../src/db/policy.repo.js';
import { addInterval } from '../../src/domain/period.js';
import {
  tenants, tenantApiKeys, customers, planGroups, plans,
  subscriptions, invoices, events, ledgerEntries,
} from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';

describe('Phase 3: year of card billing', () => {
  const PLAN_AMOUNT = 500_000n; // ₦5,000/month

  // Use a controllable "wall clock"  — a mutable object
  const mutableNow = { value: new Date('2026-01-01T00:00:00Z') };
  const testClock = { now: () => mutableNow.value };

  const uow = new DrizzleUnitOfWork();
  const tenantRepo = new TenantRepo();
  const customerRepo = new CustomerRepo();
  const ledgerRepo = new LedgerRepo();
  const planGroupRepo = new PlanGroupRepo();
  const planRepo = new PlanRepo();
  const subscriptionRepo = new SubscriptionRepo();
  const invoiceRepo = new InvoiceRepo();
  const eventRepo = new EventRepo();
  const nomba = new FakeNombaAdapter();
  const chargeCard = new ChargeCardService(nomba);
  const postLedgerEntry = new PostLedgerEntryService(customerRepo, ledgerRepo, uow, testClock);
  const scheduledChangeRepo = new ScheduledChangeRepo();
  const dunningAttemptRepo = new DunningAttemptRepo();
  const policyRepo = new TenantPolicyRepo();

  const createTenantSvc = new CreateTenantService(tenantRepo, uow, testClock);
  const createCustomerSvc = new CreateCustomerService(customerRepo, uow, testClock);
  const createPlanGroupSvc = new CreatePlanGroupService(planGroupRepo, uow, testClock);
  const createPlanSvc = new CreatePlanService(planGroupRepo, planRepo, uow, testClock);
  const createSubscriptionSvc = new CreateSubscriptionService(
    customerRepo, planRepo, subscriptionRepo, eventRepo, uow, testClock,
  );
  const tickSvc = new TickService(
    subscriptionRepo, invoiceRepo, eventRepo, planRepo,
    chargeCard, postLedgerEntry, scheduledChangeRepo,
    dunningAttemptRepo, policyRepo, uow, testClock,
  );

  let tenantId: string;

  beforeEach(async () => {
    mutableNow.value = new Date('2026-01-01T00:00:00Z');
    const { tenantId: tid } = await createTenantSvc.execute({ name: 'Year-Billing Corp', mode: 'test' });
    tenantId = tid;
  });

  afterEach(async () => {
    await db.delete(events).where(eq(events.tenantId, tenantId));
    await db.delete(ledgerEntries).where(eq(ledgerEntries.tenantId, tenantId));
    await db.delete(invoices).where(eq(invoices.tenantId, tenantId));
    await db.delete(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    await db.delete(plans).where(eq(plans.tenantId, tenantId));
    await db.delete(planGroups).where(eq(planGroups.tenantId, tenantId));
    await db.delete(customers).where(eq(customers.tenantId, tenantId));
    await db.delete(tenantApiKeys).where(eq(tenantApiKeys.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('advances 12 months → 12 invoices paid, balance = 12 × plan amount', async () => {
    // Setup catalog
    const { planGroupId } = await createPlanGroupSvc.execute({ tenantId, name: 'Core' });
    const { planId } = await createPlanSvc.execute({
      tenantId,
      planGroupId,
      name:            'Monthly ₦5k',
      amountMinor:     PLAN_AMOUNT,
      billingInterval: 'month',
    });
    const { customerId } = await createCustomerSvc.execute({
      tenantId,
      externalRef: 'user_year_001',
      name:        'Acme Corp',
      email:       'billing@acme.ng',
      phone:       null,
    });

    // Create subscription at T=0 (Jan 1 2026) with a card token
    await createSubscriptionSvc.execute({
      tenantId,
      customerId,
      planId,
      defaultPaymentMethodId: 'tok_test_visa',
    });

    // Simulate 12 monthly renewals
    let renewedTotal = 0;
    for (let month = 1; month <= 12; month++) {
      // Advance clock to next billing date
      mutableNow.value = addInterval(new Date('2026-01-01T00:00:00Z'), 'month', month);
      const result = await tickSvc.tick(tenantId);
      renewedTotal += result.renewed;
    }

    expect(renewedTotal).toBe(12);

    // Verify 12 paid invoices
    const allInvoices = await invoiceRepo.findBySubscription(
      tenantId,
      (await subscriptionRepo.findDueForBilling(tenantId, new Date('2030-01-01T00:00:00Z')))[0]?.id ??
        (await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)))[0]!.id,
    );
    // A simpler check: count paid invoices from DB
    const allInvRows = await db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
    expect(allInvRows).toHaveLength(12);
    expect(allInvRows.every((inv) => inv.state === 'paid')).toBe(true);

    // Verify 12 ledger entries
    const entries = await ledgerRepo.listForCustomer(tenantId, customerId);
    expect(entries).toHaveLength(12);
    expect(entries.every((e) => e.amountMinor === PLAN_AMOUNT)).toBe(true);

    // Customer balance = 12 × ₦5,000 = ₦60,000
    const customer = await customerRepo.findById(tenantId, customerId);
    expect(customer!.accountBalanceMinor).toBe(PLAN_AMOUNT * 12n);

    // 12 subscription.renewed events
    const allEvents = await db.select().from(events).where(eq(events.tenantId, tenantId));
    const renewedEvents = allEvents.filter((e) => e.type === 'subscription.renewed');
    expect(renewedEvents).toHaveLength(12);
  }, 30_000); // 30s timeout for 12 DB round-trips
});
