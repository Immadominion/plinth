export const MOCK_STATS = {
  mrr: 24500000,
  arr: 294000000,
  activeSubscriptions: 47,
  newThisWeek: 8,
  churnedThisWeek: 2,
  failedCharges: 5,
  recoveredRevenue: 3200000,
  dunningActive: 7,
};

export const MOCK_MRR_TREND = [
  { month: 'Jan', mrr: 12000000 },
  { month: 'Feb', mrr: 14500000 },
  { month: 'Mar', mrr: 16800000 },
  { month: 'Apr', mrr: 19200000 },
  { month: 'May', mrr: 22100000 },
  { month: 'Jun', mrr: 24500000 },
];

export const MOCK_SUB_STATES = [
  { state: 'active', count: 38, color: '#10b981' },
  { state: 'trialing', count: 4, color: '#3b82f6' },
  { state: 'past_due', count: 3, color: '#f59e0b' },
  { state: 'grace', count: 2, color: '#f97316' },
  { state: 'delinquent', count: 1, color: '#ef4444' },
  { state: 'canceled', count: 4, color: '#6b7280' },
];

export const MOCK_CUSTOMERS = [
  { id: 'cus_01', name: 'Acme Technologies', email: 'billing@acme.ng', balance: 0, subscriptionState: 'active', hasVa: true, plan: 'Pro', createdAt: '2026-01-15' },
  { id: 'cus_02', name: 'Zenith Logistics', email: 'pay@zenith.ng', balance: 0, subscriptionState: 'past_due', hasVa: true, plan: 'Max', createdAt: '2026-02-03' },
  { id: 'cus_03', name: 'Nova Finance', email: 'accounts@nova.ng', balance: 150000, subscriptionState: 'grace', hasVa: false, plan: 'Starter', createdAt: '2026-01-28' },
  { id: 'cus_04', name: 'Bright Futures Ltd', email: 'ops@bright.ng', balance: 0, subscriptionState: 'active', hasVa: true, plan: 'Pro', createdAt: '2026-03-10' },
  { id: 'cus_05', name: 'Lagos Health Tech', email: 'billing@lht.ng', balance: 500000, subscriptionState: 'trialing', hasVa: false, plan: 'Max', createdAt: '2026-06-01' },
  { id: 'cus_06', name: 'Kano Retail Group', email: 'finance@kano.ng', balance: 0, subscriptionState: 'delinquent', hasVa: true, plan: 'Starter', createdAt: '2025-11-20' },
  { id: 'cus_07', name: 'Abuja Cloud Services', email: 'it@acs.ng', balance: 0, subscriptionState: 'active', hasVa: true, plan: 'Pro', createdAt: '2026-02-18' },
];

export const MOCK_SUBSCRIPTIONS = [
  { id: 'sub_01', customerId: 'cus_01', customerName: 'Acme Technologies', plan: 'Pro', amount: 500000, state: 'active', rail: 'card', nextBillAt: '2026-07-01', createdAt: '2026-01-15' },
  { id: 'sub_02', customerId: 'cus_02', customerName: 'Zenith Logistics', plan: 'Max', amount: 1200000, state: 'past_due', rail: 'card', nextBillAt: '2026-06-01', createdAt: '2026-02-03' },
  { id: 'sub_03', customerId: 'cus_03', customerName: 'Nova Finance', plan: 'Starter', amount: 200000, state: 'grace', rail: 'transfer', nextBillAt: '2026-06-01', createdAt: '2026-01-28' },
  { id: 'sub_04', customerId: 'cus_04', customerName: 'Bright Futures Ltd', plan: 'Pro', amount: 500000, state: 'active', rail: 'card', nextBillAt: '2026-07-10', createdAt: '2026-03-10' },
  { id: 'sub_05', customerId: 'cus_05', customerName: 'Lagos Health Tech', plan: 'Max', amount: 1200000, state: 'trialing', rail: 'card', nextBillAt: '2026-06-29', createdAt: '2026-06-01' },
  { id: 'sub_06', customerId: 'cus_06', customerName: 'Kano Retail Group', plan: 'Starter', amount: 200000, state: 'delinquent', rail: 'transfer', nextBillAt: '2026-05-01', createdAt: '2025-11-20' },
];

export const MOCK_DUNNING = {
  past_due: [
    { id: 'sub_02', customerName: 'Zenith Logistics', plan: 'Max', amount: 1200000, attempts: 2, nextRetry: '2026-06-22', declineCode: 'INSUFFICIENT_FUNDS' },
    { id: 'sub_07', customerName: 'Sunrise Imports', plan: 'Pro', amount: 500000, attempts: 1, nextRetry: '2026-06-18', declineCode: 'INSUFFICIENT_FUNDS' },
    { id: 'sub_08', customerName: 'Delta Farms', plan: 'Starter', amount: 200000, attempts: 3, nextRetry: '2026-06-25', declineCode: 'DO_NOT_HONOR' },
  ],
  grace: [
    { id: 'sub_03', customerName: 'Nova Finance', plan: 'Starter', amount: 200000, daysRemaining: 5, enteredGraceAt: '2026-06-10' },
    { id: 'sub_09', customerName: 'Ibadan Medics', plan: 'Pro', amount: 500000, daysRemaining: 1, enteredGraceAt: '2026-06-06' },
  ],
  delinquent: [
    { id: 'sub_06', customerName: 'Kano Retail Group', plan: 'Starter', amount: 200000, since: '2026-05-15', owed: 400000 },
  ],
  recovered: [
    { id: 'sub_10', customerName: 'Port Harcourt Fintech', plan: 'Pro', amount: 500000, recoveredAt: '2026-06-14', attempt: 2 },
    { id: 'sub_11', customerName: 'Enugu Logistics', plan: 'Max', amount: 1200000, recoveredAt: '2026-06-12', attempt: 1 },
  ],
};

export const MOCK_INVOICES = [
  { id: 'inv_01', customer: 'Acme Technologies', plan: 'Pro', amount: 500000, state: 'paid', billingMode: 'advance', period: 'Jun 2026', dueAt: '2026-06-01', closedAt: '2026-06-01' },
  { id: 'inv_02', customer: 'Zenith Logistics', plan: 'Max', amount: 1200000, state: 'open', billingMode: 'advance', period: 'Jun 2026', dueAt: '2026-06-01', closedAt: null },
  { id: 'inv_03', customer: 'Nova Finance', plan: 'Starter', amount: 200000, state: 'partially_paid', billingMode: 'advance', period: 'Jun 2026', dueAt: '2026-06-01', closedAt: null },
  { id: 'inv_04', customer: 'Bright Futures Ltd', plan: 'Pro', amount: 500000, state: 'paid', billingMode: 'advance', period: 'Jun 2026', dueAt: '2026-06-10', closedAt: '2026-06-10' },
  { id: 'inv_05', customer: 'Lagos Health Tech', plan: 'Max', amount: 1200000, state: 'open', billingMode: 'arrears', period: 'Jun 2026', dueAt: '2026-06-29', closedAt: null },
];

export const MOCK_TRANSFERS = {
  recent: [
    { id: 'ite_01', accountRef: 'cus_01', amount: 500000, narration: 'NOMBA/ACME/SUB PAYMENT', outcome: 'paid', matchedInvoice: 'inv_01', date: '2026-06-01' },
    { id: 'ite_02', accountRef: 'cus_03', amount: 100000, narration: 'NOVA FINANCE PAYMENT', outcome: 'partial', matchedInvoice: 'inv_03', date: '2026-06-05' },
    { id: 'ite_03', accountRef: 'unknown_ref', amount: 350000, narration: 'UNKNOWN TRANSFER', outcome: 'suspense', matchedInvoice: null, date: '2026-06-08' },
  ],
  suspense: [
    { id: 'sus_01', accountRef: 'unknown_ref', amount: 350000, narration: 'UNKNOWN TRANSFER', reason: 'no_va', date: '2026-06-08' },
  ],
};

export const MOCK_PLANS = [
  { id: 'plan_starter', name: 'Starter', group: 'Core', amount: 200000, interval: 'month', active: true, features: ['Up to 3 users', '5GB storage', 'Email support'] },
  { id: 'plan_pro', name: 'Pro', group: 'Core', amount: 500000, interval: 'month', active: true, features: ['Up to 25 users', '50GB storage', 'Priority support', 'API access'] },
  { id: 'plan_max', name: 'Max', group: 'Core', amount: 1200000, interval: 'month', active: true, features: ['Unlimited users', '500GB storage', 'Dedicated support', 'API access', 'Custom integrations'] },
];

// Rich, varied set: multiple event families + several UNDELIVERED (which render a "Resend" button).
export const MOCK_EVENTS = [
  { id: 'evt_01', type: 'subscription.activated',             resourceId: 'sub_ada',    tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-15T08:00:00Z' },
  { id: 'evt_02', type: 'invoice.paid',                       resourceId: 'inv_01',     tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-15T08:00:01Z' },
  { id: 'evt_03', type: 'invoice.payment_due',                resourceId: 'inv_03',     tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-15T09:00:00Z' },
  { id: 'evt_04', type: 'subscription.past_due',              resourceId: 'sub_bola',   tenantId: 'ten_01', delivered: false, occurredAt: '2026-06-16T09:15:00Z' },
  { id: 'evt_05', type: 'subscription.grace',                 resourceId: 'sub_emeka',  tenantId: 'ten_01', delivered: false, occurredAt: '2026-06-17T00:00:00Z' },
  { id: 'evt_06', type: 'subscription.delinquent',            resourceId: 'sub_ngozi',  tenantId: 'ten_01', delivered: false, occurredAt: '2026-06-18T00:00:00Z' },
  { id: 'evt_07', type: 'subscription.recovered',            resourceId: 'sub_chidi',  tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-18T11:00:00Z' },
  { id: 'evt_08', type: 'subscription.trial_ended',          resourceId: 'sub_tunde',  tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-19T00:00:00Z' },
  { id: 'evt_09', type: 'invoice.partially_paid',            resourceId: 'inv_04',     tenantId: 'ten_01', delivered: false, occurredAt: '2026-06-19T14:30:00Z' },
  { id: 'evt_10', type: 'subscription.plan_change_scheduled', resourceId: 'sub_sch',    tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-20T16:45:00Z' },
  { id: 'evt_11', type: 'subscription.canceled',            resourceId: 'sub_zainab', tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-20T18:00:00Z' },
  { id: 'evt_12', type: 'subscription.renewed',             resourceId: 'sub_ada',    tenantId: 'ten_01', delivered: true,  occurredAt: '2026-06-21T08:00:00Z' },
];

export const MOCK_ADMIN_TENANTS = [
  { id: 'ten_01', name: 'Nollybox',        mode: 'live', mrr: 24500000, customers: 47,  suspense: 1, queueLag: 0 },
  { id: 'ten_02', name: 'PayFlow Nigeria', mode: 'live', mrr: 68000000, customers: 134, suspense: 5, queueLag: 12 }, // high suspense + queue lag
  { id: 'ten_03', name: 'FitClub NG',      mode: 'live', mrr: 9800000,  customers: 63,  suspense: 0, queueLag: 0 },
  { id: 'ten_04', name: 'EduPrime',        mode: 'live', mrr: 15200000, customers: 88,  suspense: 2, queueLag: 1 },
  { id: 'ten_05', name: 'Dev Sandbox',     mode: 'test', mrr: 0,        customers: 12,  suspense: 0, queueLag: 0 },
];

export const MOCK_APPLICATIONS = [
  {
    id: 'app_01',
    businessName: 'Kolade Tech Solutions',
    contactName: 'Kolade Bello',
    email: 'kolade@kolade.tech',
    rcNumber: 'RC-1234567',
    website: 'https://kolade.tech',
    description: 'Building a SaaS HR platform for Nigerian SMEs — leave management, payroll, and employee self-service.',
    status: 'pending' as const,
    nombaSubAccountId: null as string | null,
    tenantId: null as string | null,
    rejectionReason: null as string | null,
    reviewedAt: null as string | null,
    createdAt: '2026-06-17T10:30:00Z',
  },
  {
    id: 'app_02',
    businessName: 'Femi Cloud Ltd',
    contactName: 'Femi Adesanya',
    email: 'femi@femicloud.ng',
    rcNumber: 'RC-7654321',
    website: null as string | null,
    description: 'Subscription management and invoicing tool for Nigerian freelancers and agencies.',
    status: 'pending' as const,
    nombaSubAccountId: null as string | null,
    tenantId: null as string | null,
    rejectionReason: null as string | null,
    reviewedAt: null as string | null,
    createdAt: '2026-06-16T14:20:00Z',
  },
  {
    id: 'app_03',
    businessName: 'Acme SaaS Co',
    contactName: 'Tunde Ogunyemi',
    email: 'tunde@acme.ng',
    rcNumber: 'RC-1111111',
    website: 'https://acme.ng',
    description: 'Enterprise resource planning SaaS for mid-market Nigerian businesses.',
    status: 'approved' as const,
    nombaSubAccountId: 'NOMBA_SUB_001',
    tenantId: 'ten_01',
    rejectionReason: null as string | null,
    reviewedAt: '2026-06-11T11:00:00Z',
    createdAt: '2026-06-10T09:00:00Z',
  },
  {
    id: 'app_04',
    businessName: 'Bright Futures Ltd',
    contactName: 'Amaka Okonkwo',
    email: 'amaka@brightfutures.ng',
    rcNumber: null as string | null,
    website: null as string | null,
    description: 'test',
    status: 'rejected' as const,
    nombaSubAccountId: null as string | null,
    tenantId: null as string | null,
    rejectionReason: 'Insufficient business information. Please provide a valid RC number and a description of your product.',
    reviewedAt: '2026-06-15T08:30:00Z',
    createdAt: '2026-06-15T08:00:00Z',
  },
];

