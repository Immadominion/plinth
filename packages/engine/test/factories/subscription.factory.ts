import type { Subscription } from '../../src/db/subscription.repo.js';
import type { Invoice } from '../../src/db/invoice.repo.js';

let seq = 0;

const BASE = new Date('2026-01-01T00:00:00Z');
const MONTH_LATER = new Date('2026-02-01T00:00:00Z');

export function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  const i = ++seq;
  return {
    id:                     `sub_test_${i}`,
    tenantId:               'ten_test',
    customerId:             'cus_test_1',
    planId:                 'pln_test_1',
    state:                  'active',
    quantity:               1,
    defaultPaymentMethodId: 'tok_test_visa',
    preferredRail:          'card',
    currentPeriodStart:     BASE,
    currentPeriodEnd:       MONTH_LATER,
    nextBillAt:             MONTH_LATER,
    trialEndAt:             null,
    pausedAt:               null,
    canceledAt:             null,
    metadata:               {},
    createdAt:              BASE,
    updatedAt:              BASE,
    ...overrides,
  };
}

export function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const i = ++seq;
  return {
    id:              `inv_test_${i}`,
    tenantId:        'ten_test',
    customerId:      'cus_test_1',
    subscriptionId:  'sub_test_1',
    state:           'draft',
    currency:        'NGN',
    amountDueMinor:  500_000n,
    amountPaidMinor: 0n,
    periodStart:     BASE,
    periodEnd:       MONTH_LATER,
    dueAt:           BASE,
    billingMode:     'advance',
    isReceivable:    false,
    closedAt:        null,
    createdAt:       BASE,
    updatedAt:       BASE,
    ...overrides,
  };
}
