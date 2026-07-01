import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../src/db/client.js';
import { DrizzleUnitOfWork } from '../../src/db/unit-of-work.js';
import { DrizzleCustomerRepo } from '../../src/db/customer.repo.js';
import { DrizzleLedgerRepo } from '../../src/db/ledger.repo.js';
import { DrizzlePlanGroupRepo, DrizzlePlanRepo } from '../../src/db/catalog.repo.js';
import { DrizzleSubscriptionRepo } from '../../src/db/subscription.repo.js';
import { DrizzleInvoiceRepo } from '../../src/db/invoice.repo.js';
import { DrizzleEventRepo } from '../../src/db/event.repo.js';
import { DrizzleTenantRepo } from '../../src/db/tenant.repo.js';
import { DrizzleVirtualAccountRepo } from '../../src/db/virtual-account.repo.js';
import { DrizzleInboundTransferRepo } from '../../src/db/inbound-transfer.repo.js';
import { DrizzleSuspenseRepo } from '../../src/db/suspense.repo.js';
import { DrizzleScheduledChangeRepo } from '../../src/db/scheduled-change.repo.js';
import { DrizzleTenantPolicyRepo } from '../../src/db/policy.repo.js';
import { FakeNombaAdapter } from '../../src/adapters/nomba.js';
import { CreateTenantService } from '../../src/services/tenant.service.js';
import { CreateCustomerService } from '../../src/services/customer.service.js';
import { CreatePlanGroupService, CreatePlanService } from '../../src/services/catalog.service.js';
import { CreateSubscriptionService } from '../../src/services/subscription.service.js';
import { PostLedgerEntryService } from '../../src/services/ledger.service.js';
import { ChargeCardService, TickService } from '../../src/services/billing.service.js';
import { ProvisionVirtualAccountService } from '../../src/services/virtual-account.service.js';
import { TransferReconService } from '../../src/services/transfer-recon.service.js';
import {
  tenants, tenantApiKeys, customers, planGroups, plans,
  subscriptions, invoices, events, ledgerEntries,
  virtualAccounts, inboundTransferEvents, suspenseItems,
} from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';

describe('Phase 5: transfer reconciliation', () => {
  const PLAN_AMOUNT = 500_000n; // ₦5,000

  const now = new Date('2026-06-01T00:00:00Z');
  const clock = { now: () => now };

  const uow = new DrizzleUnitOfWork();
  const tenantRepo = new DrizzleTenantRepo();
  const customerRepo = new DrizzleCustomerRepo();
  const ledgerRepo = new DrizzleLedgerRepo();
  const planGroupRepo = new DrizzlePlanGroupRepo();
  const planRepo = new DrizzlePlanRepo();
  const subscriptionRepo = new DrizzleSubscriptionRepo();
  const invoiceRepo = new DrizzleInvoiceRepo();
  const eventRepo = new DrizzleEventRepo();
  const vaRepo = new DrizzleVirtualAccountRepo();
  const inboundRepo = new DrizzleInboundTransferRepo();
  const suspenseRepo = new DrizzleSuspenseRepo();
  const scheduledChangeRepo = new DrizzleScheduledChangeRepo();
  const policyRepo = new DrizzleTenantPolicyRepo();
  const nomba = new FakeNombaAdapter();

  const createTenantSvc = new CreateTenantService(tenantRepo, uow, clock);
  const createCustomerSvc = new CreateCustomerService(customerRepo, uow, clock);
  const createPlanGroupSvc = new CreatePlanGroupService(planGroupRepo, uow, clock);
  const createPlanSvc = new CreatePlanService(planGroupRepo, planRepo, uow, clock);
  const createSubscriptionSvc = new CreateSubscriptionService(
    customerRepo, planRepo, subscriptionRepo, eventRepo, policyRepo, uow, clock,
  );
  const postLedgerEntry = new PostLedgerEntryService(customerRepo, ledgerRepo, uow, clock);
  const chargeCard = new ChargeCardService(nomba);
  const tickSvc = new TickService(
    subscriptionRepo, invoiceRepo, eventRepo, planRepo,
    chargeCard, postLedgerEntry, scheduledChangeRepo, uow, clock,
  );
  const provisionVaSvc = new ProvisionVirtualAccountService(nomba, vaRepo, customerRepo, clock);
  const reconSvc = new TransferReconService(
    vaRepo, inboundRepo, suspenseRepo, invoiceRepo, eventRepo, postLedgerEntry, uow, clock,
  );

  let tenantId: string;
  let customerId: string;
  let planId: string;

  beforeEach(async () => {
    const { tenantId: tid } = await createTenantSvc.execute({ name: 'Phase5 Corp', mode: 'test' });
    tenantId = tid;

    const { planGroupId } = await createPlanGroupSvc.execute({ tenantId, name: 'Core' });
    const plan = await createPlanSvc.execute({
      tenantId,
      planGroupId,
      name:            'Monthly ₦5k',
      amountMinor:     PLAN_AMOUNT,
      billingInterval: 'month',
      lookupKey:       'monthly_5k',
    });
    planId = plan.planId;

    const cust = await createCustomerSvc.execute({
      tenantId,
      externalRef: 'user_p5_001',
      name:        'Chidi Okeke',
      email:       'chidi@example.ng',
      phone:       null,
    });
    customerId = cust.customerId;
  });

  afterEach(async () => {
    await db.delete(suspenseItems).where(eq(suspenseItems.tenantId, tenantId));
    await db.delete(inboundTransferEvents).where(eq(inboundTransferEvents.tenantId, tenantId));
    // also clean up suspense items with null tenantId from the unknown-VA scenario
    // those are identified by nomba_request_id pattern — we just delete all unresolved for safety
    await db.delete(events).where(eq(events.tenantId, tenantId));
    await db.delete(ledgerEntries).where(eq(ledgerEntries.tenantId, tenantId));
    await db.delete(invoices).where(eq(invoices.tenantId, tenantId));
    await db.delete(virtualAccounts).where(eq(virtualAccounts.tenantId, tenantId));
    await db.delete(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    await db.delete(plans).where(eq(plans.tenantId, tenantId));
    await db.delete(planGroups).where(eq(planGroups.tenantId, tenantId));
    await db.delete(customers).where(eq(customers.tenantId, tenantId));
    await db.delete(tenantApiKeys).where(eq(tenantApiKeys.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('1. provisions a virtual account for a customer (idempotent)', async () => {
    const va1 = await provisionVaSvc.execute({ tenantId, customerId });
    const va2 = await provisionVaSvc.execute({ tenantId, customerId });

    expect(va1.id).toBe(va2.id);
    expect(va1.customerId).toBe(customerId);
    expect(va1.tenantId).toBe(tenantId);
    expect(va1.accountNumber).toMatch(/^\d+$/);
  });

  it('2. exact transfer pays invoice, creates ledger entry, emits event', async () => {
    // Create subscription → creates first invoice via tick
    await createSubscriptionSvc.execute({ tenantId, customerId, planId, defaultPaymentMethodId: null });

    // Provision VA
    const va = await provisionVaSvc.execute({ tenantId, customerId });

    // Manually create an open invoice (tick creates them with a card charge, use invoiceRepo directly)
    const { ulid } = await import('ulid');
    const invoiceId = `inv_${ulid()}`;
    await invoiceRepo.create({
      id:              invoiceId,
      tenantId,
      customerId,
      subscriptionId:  'sub_dummy',
      state:           'open',
      currency:        'NGN',
      amountDueMinor:  PLAN_AMOUNT,
      amountPaidMinor: 0n,
      periodStart:     now,
      periodEnd:       new Date('2026-07-01T00:00:00Z'),
      dueAt:           now,
      billingMode:     'advance',
      isReceivable:    true,
      closedAt:        null,
      createdAt:       now,
      updatedAt:       now,
    });

    const result = await reconSvc.handleTransfer({
      nombaRequestId: 'req_integ_exact_001',
      accountRef:     va.accountRef,
      amountMinor:    PLAN_AMOUNT,
      narration:      'Bank transfer - Chidi Okeke',
      sessionId:      'sess_integ_001',
    });

    expect(result.outcome).toBe('paid');

    // Invoice is paid
    const inv = await invoiceRepo.findById(tenantId, invoiceId);
    expect(inv!.state).toBe('paid');
    expect(inv!.amountPaidMinor).toBe(PLAN_AMOUNT);

    // Ledger entry exists
    const entries = await ledgerRepo.listForCustomer(tenantId, customerId);
    expect(entries.some((e) => e.invoiceId === invoiceId)).toBe(true);

    // Event emitted
    const allEvents = await db.select().from(events).where(eq(events.tenantId, tenantId));
    expect(allEvents.some((e) => e.type === 'invoice.paid')).toBe(true);
  });

  it('3. unknown account ref → suspense item created', async () => {
    const result = await reconSvc.handleTransfer({
      nombaRequestId: 'req_integ_unknown_001',
      accountRef:     'completely_unknown_account_ref',
      amountMinor:    100_000n,
      narration:      'Mystery money',
      sessionId:      'sess_unknown',
    });

    expect(result.outcome).toBe('suspense');

    const unresolved = await suspenseRepo.findUnresolved();
    const mine = unresolved.find((s) => s.nombaRequestId === 'req_integ_unknown_001');
    expect(mine).toBeDefined();
    expect(mine!.reason).toBe('no_va');
    expect(mine!.amountMinor).toBe(100_000n);
  });

  it('4. overpayment → invoice paid + credit ledger entry', async () => {
    const va = await provisionVaSvc.execute({ tenantId, customerId });

    const { ulid } = await import('ulid');
    const invoiceId = `inv_${ulid()}`;
    await invoiceRepo.create({
      id:              invoiceId,
      tenantId,
      customerId,
      subscriptionId:  'sub_dummy2',
      state:           'open',
      currency:        'NGN',
      amountDueMinor:  PLAN_AMOUNT,
      amountPaidMinor: 0n,
      periodStart:     now,
      periodEnd:       new Date('2026-07-01T00:00:00Z'),
      dueAt:           now,
      billingMode:     'advance',
      isReceivable:    true,
      closedAt:        null,
      createdAt:       now,
      updatedAt:       now,
    });

    // Pay ₦6,000 (600,000 kobo) on a ₦5,000 invoice — overpayment of ₦1,000 > ₦100 tolerance
    const result = await reconSvc.handleTransfer({
      nombaRequestId: 'req_integ_over_001',
      accountRef:     va.accountRef,
      amountMinor:    600_000n,
      narration:      'Overpayment transfer',
      sessionId:      'sess_over',
    });

    expect(result.outcome).toBe('overpaid');

    const inv = await invoiceRepo.findById(tenantId, invoiceId);
    expect(inv!.state).toBe('paid');

    const entries = await ledgerRepo.listForCustomer(tenantId, customerId);
    // One for invoice, one for overpayment credit
    expect(entries.length).toBe(2);
    expect(entries.some((e) => e.invoiceId === invoiceId && e.amountMinor === PLAN_AMOUNT)).toBe(true);
    expect(entries.some((e) => e.invoiceId == null && e.amountMinor === 100_000n)).toBe(true);
  });
}, 30_000);
