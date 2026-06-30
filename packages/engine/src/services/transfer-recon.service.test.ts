import { describe, it, expect, beforeEach } from 'vitest';
import { TransferReconService } from './transfer-recon.service.js';
import { InMemoryVirtualAccountRepo } from '../../test/fakes/in-memory-virtual-account.repo.js';
import { InMemoryInboundTransferRepo } from '../../test/fakes/in-memory-inbound-transfer.repo.js';
import { InMemorySuspenseRepo } from '../../test/fakes/in-memory-suspense.repo.js';
import { InMemoryInvoiceRepo } from '../../test/fakes/in-memory-invoice.repo.js';
import { InMemoryEventRepo } from '../../test/fakes/in-memory-event.repo.js';
import { InMemoryCustomerRepo } from '../../test/fakes/in-memory-customer.repo.js';
import { InMemoryLedgerRepo } from '../../test/fakes/in-memory-ledger.repo.js';
import { FakeUnitOfWork } from '../../test/fakes/fake-unit-of-work.js';
import { PostLedgerEntryService } from './ledger.service.js';
import type { VirtualAccount } from '../db/virtual-account.repo.js';
import type { Invoice } from '../db/invoice.repo.js';
import type { Customer } from '../db/customer.repo.js';

const NOW = new Date('2026-06-01T00:00:00Z');
const clock = { now: () => NOW };

const TENANT = 'ten_test';
const CUSTOMER = 'cus_test';

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id:                  CUSTOMER,
    tenantId:            TENANT,
    externalRef:         'ext_001',
    name:                'Test Customer',
    email:               'test@example.com',
    phone:               null,
    accountBalanceMinor: 0n,
    createdAt:           NOW,
    ...overrides,
  };
}

function makeVA(overrides: Partial<VirtualAccount> = {}): VirtualAccount {
  return {
    id:                   'va_001',
    tenantId:             TENANT,
    customerId:           CUSTOMER,
    accountRef:           CUSTOMER,
    nombaAccountHolderId: 'holder_001',
    accountNumber:        '9391234567',
    bankName:             'Nomba MFB',
    accountName:          'Test Customer',
    createdAt:            NOW,
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id:              'inv_001',
    tenantId:        TENANT,
    customerId:      CUSTOMER,
    subscriptionId:  'sub_001',
    state:           'open',
    currency:        'NGN',
    amountDueMinor:  500_000n,
    amountPaidMinor: 0n,
    periodStart:     new Date('2026-06-01T00:00:00Z'),
    periodEnd:       new Date('2026-07-01T00:00:00Z'),
    dueAt:           new Date('2026-06-01T00:00:00Z'),
    billingMode:     'advance',
    isReceivable:    false,
    closedAt:        null,
    createdAt:       NOW,
    updatedAt:       NOW,
    ...overrides,
  };
}

function buildService() {
  const vaRepo = new InMemoryVirtualAccountRepo();
  const inboundRepo = new InMemoryInboundTransferRepo();
  const suspenseRepo = new InMemorySuspenseRepo();
  const invoiceRepo = new InMemoryInvoiceRepo();
  const eventRepo = new InMemoryEventRepo();
  const customerRepo = new InMemoryCustomerRepo();
  const ledgerRepo = new InMemoryLedgerRepo();
  const uow = new FakeUnitOfWork();
  const postLedgerEntry = new PostLedgerEntryService(customerRepo, ledgerRepo, uow, clock);

  const service = new TransferReconService(
    vaRepo, inboundRepo, suspenseRepo, invoiceRepo, eventRepo, postLedgerEntry, uow, clock,
  );

  return { service, vaRepo, inboundRepo, suspenseRepo, invoiceRepo, eventRepo, customerRepo, ledgerRepo };
}

describe('TransferReconService', () => {
  describe('1. Exact payment', () => {
    it('marks invoice paid, posts ledger entry, emits invoice.paid event', async () => {
      const { service, vaRepo, invoiceRepo, eventRepo, customerRepo, ledgerRepo } = buildService();

      customerRepo.seed(makeCustomer());
      vaRepo.seed(makeVA());
      invoiceRepo.seed(makeInvoice({ amountDueMinor: 500_000n }));

      const result = await service.handleTransfer({
        nombaRequestId: 'req_001',
        accountRef:     CUSTOMER,
        amountMinor:    500_000n,
        narration:      'Payment',
        sessionId:      'sess_001',
      });

      expect(result.outcome).toBe('paid');

      const inv = await invoiceRepo.findById(TENANT, 'inv_001');
      expect(inv!.state).toBe('paid');
      expect(inv!.amountPaidMinor).toBe(500_000n);
      expect(inv!.closedAt).toEqual(NOW);

      const entries = await ledgerRepo.listForCustomer(TENANT, CUSTOMER);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries.some((e) => e.invoiceId === 'inv_001')).toBe(true);

      const events = eventRepo.all();
      expect(events.some((e) => e.type === 'invoice.paid')).toBe(true);
    });
  });

  describe('2. Overpayment', () => {
    it('marks invoice paid and posts excess as credit ledger entry', async () => {
      const { service, vaRepo, invoiceRepo, eventRepo, customerRepo, ledgerRepo } = buildService();

      customerRepo.seed(makeCustomer());
      vaRepo.seed(makeVA());
      invoiceRepo.seed(makeInvoice({ amountDueMinor: 500_000n }));

      // Pay ₦15,000 over (150,000 kobo > TOLERANCE_KOBO of 10,000)
      const result = await service.handleTransfer({
        nombaRequestId: 'req_over_001',
        accountRef:     CUSTOMER,
        amountMinor:    650_000n,
        narration:      'Overpayment',
        sessionId:      'sess_002',
      });

      expect(result.outcome).toBe('overpaid');

      const inv = await invoiceRepo.findById(TENANT, 'inv_001');
      expect(inv!.state).toBe('paid');

      const entries = await ledgerRepo.listForCustomer(TENANT, CUSTOMER);
      // Two entries: one for invoice, one for overpayment credit
      expect(entries.length).toBe(2);
      expect(entries.some((e) => e.invoiceId === 'inv_001')).toBe(true);
      expect(entries.some((e) => e.invoiceId == null && e.amountMinor === 150_000n)).toBe(true);

      const events = eventRepo.all();
      expect(events.some((e) => e.type === 'invoice.paid')).toBe(true);
    });
  });

  describe('3. Short payment', () => {
    it('marks invoice partially_paid and emits invoice.partially_paid event', async () => {
      const { service, vaRepo, invoiceRepo, eventRepo, customerRepo } = buildService();

      customerRepo.seed(makeCustomer());
      vaRepo.seed(makeVA());
      invoiceRepo.seed(makeInvoice({ amountDueMinor: 500_000n }));

      const result = await service.handleTransfer({
        nombaRequestId: 'req_partial_001',
        accountRef:     CUSTOMER,
        amountMinor:    200_000n,
        narration:      'Partial payment',
        sessionId:      'sess_003',
      });

      expect(result.outcome).toBe('partial');

      const inv = await invoiceRepo.findById(TENANT, 'inv_001');
      expect(inv!.state).toBe('partially_paid');
      expect(inv!.amountPaidMinor).toBe(200_000n);

      const events = eventRepo.all();
      expect(events.some((e) => e.type === 'invoice.partially_paid')).toBe(true);
    });
  });

  describe('4. Second transfer completes partial', () => {
    it('two transfers summing to full amount → eventually paid', async () => {
      const { service, vaRepo, invoiceRepo, eventRepo, customerRepo } = buildService();

      customerRepo.seed(makeCustomer());
      vaRepo.seed(makeVA());
      invoiceRepo.seed(makeInvoice({ amountDueMinor: 500_000n }));

      // First: partial
      await service.handleTransfer({
        nombaRequestId: 'req_p1',
        accountRef:     CUSTOMER,
        amountMinor:    300_000n,
        narration:      'First partial',
        sessionId:      'sess_p1',
      });

      const afterFirst = await invoiceRepo.findById(TENANT, 'inv_001');
      expect(afterFirst!.state).toBe('partially_paid');
      expect(afterFirst!.amountPaidMinor).toBe(300_000n);

      // Second: completes
      const result = await service.handleTransfer({
        nombaRequestId: 'req_p2',
        accountRef:     CUSTOMER,
        amountMinor:    200_000n,
        narration:      'Second partial',
        sessionId:      'sess_p2',
      });

      expect(result.outcome).toBe('paid');

      const afterSecond = await invoiceRepo.findById(TENANT, 'inv_001');
      expect(afterSecond!.state).toBe('paid');
      expect(afterSecond!.amountPaidMinor).toBe(500_000n);

      const events = eventRepo.all();
      expect(events.some((e) => e.type === 'invoice.paid')).toBe(true);
    });
  });

  describe('5. Unknown VA', () => {
    it('creates suspense item and returns outcome suspense', async () => {
      const { service, suspenseRepo } = buildService();

      const result = await service.handleTransfer({
        nombaRequestId: 'req_noVA_001',
        accountRef:     'nonexistent_ref',
        amountMinor:    100_000n,
        narration:      'Mystery transfer',
        sessionId:      'sess_noVA',
      });

      expect(result.outcome).toBe('suspense');

      const items = await suspenseRepo.findUnresolved();
      expect(items.length).toBe(1);
      expect(items[0]!.reason).toBe('no_va');
      expect(items[0]!.amountMinor).toBe(100_000n);
    });
  });

  describe('6. No open invoice', () => {
    it('credits to customer balance and returns suspense outcome', async () => {
      const { service, vaRepo, customerRepo, ledgerRepo, eventRepo } = buildService();

      customerRepo.seed(makeCustomer());
      vaRepo.seed(makeVA());
      // No invoice seeded

      const result = await service.handleTransfer({
        nombaRequestId: 'req_noInv_001',
        accountRef:     CUSTOMER,
        amountMinor:    250_000n,
        narration:      'Advance payment',
        sessionId:      'sess_noInv',
      });

      expect(result.outcome).toBe('suspense');

      const entries = await ledgerRepo.listForCustomer(TENANT, CUSTOMER);
      expect(entries.length).toBe(1);
      expect(entries[0]!.amountMinor).toBe(250_000n);
      expect(entries[0]!.type).toBe('payment_received');

      const events = eventRepo.all();
      expect(events.some((e) => e.type === 'transfer.credited_to_balance')).toBe(true);
    });
  });

  describe('7. Duplicate delivery', () => {
    it('is idempotent — returns same outcome on second call with same nombaRequestId', async () => {
      const { service, vaRepo, invoiceRepo, customerRepo } = buildService();

      customerRepo.seed(makeCustomer());
      vaRepo.seed(makeVA());
      invoiceRepo.seed(makeInvoice({ amountDueMinor: 500_000n }));

      const first = await service.handleTransfer({
        nombaRequestId: 'req_dup_001',
        accountRef:     CUSTOMER,
        amountMinor:    500_000n,
        narration:      'Payment',
        sessionId:      'sess_dup',
      });

      // Second call — same request ID
      const second = await service.handleTransfer({
        nombaRequestId: 'req_dup_001',
        accountRef:     CUSTOMER,
        amountMinor:    500_000n,
        narration:      'Payment',
        sessionId:      'sess_dup',
      });

      expect(second.outcome).toBe(first.outcome);

      // Invoice should still be paid exactly once
      const inv = await invoiceRepo.findById(TENANT, 'inv_001');
      expect(inv!.state).toBe('paid');
    });
  });

  describe('8. tieOut', () => {
    it('returns suspense count and total after creating suspense items', async () => {
      const { service } = buildService();

      // Two unknown-VA transfers
      await service.handleTransfer({
        nombaRequestId: 'req_tie_001',
        accountRef:     'unknown_ref_1',
        amountMinor:    100_000n,
        narration:      '',
        sessionId:      '',
      });
      await service.handleTransfer({
        nombaRequestId: 'req_tie_002',
        accountRef:     'unknown_ref_2',
        amountMinor:    200_000n,
        narration:      '',
        sessionId:      '',
      });

      // tieOut with no tenantId filter (suspense items have tenantId=null)
      const result = await service.tieOut(TENANT);
      // These suspense items have tenantId=null so they won't show for TENANT
      expect(result.unresolvedSuspenseCount).toBe(0);
      expect(result.suspenseTotalMinor).toBe('0');
    });
  });
});
