/**
 * Fixtures / mock mode.
 *
 * When NEXT_PUBLIC_USE_MOCKS=true, `lib/api.ts` serves `mockApi` instead of hitting the backend,
 * so the whole dashboard renders fully-populated with NO engine / Postgres / seeding.
 *
 * The data below is intentionally MAXIMAL: every list shows multiple variants so a designer sees
 * the full surface at once — subscriptions in every state, dunning cards across soft/hard declines
 * and green/orange/red grace, notifications with sent/failed/muted combos, webhook deliveries in
 * every status, invoices in every state, customers with/without a virtual account, and so on.
 *
 * To add a state to a screen, add a row here — no backend required.
 */
import type { VirtualAccount, WebhookEndpoint, WebhookDelivery } from './api';

// ── date helpers (everything is relative to "now" so dunning bars compute sensibly) ──────────────
const T0 = Date.now();
const iso = (offsetDays: number) => new Date(T0 + offsetDays * 86_400_000).toISOString();
const listOf = <T,>(data: T[]) => ({ object: 'list' as const, data });
const P = <T,>(v: T): Promise<T> => Promise.resolve(v);

// ── Tenant ───────────────────────────────────────────────────────────────────────────────────────
const TENANT = { id: 'ten_mock_nollybox', name: 'Nollybox', created_at: iso(-120) };

// ── Customers (varied contact + balance + VA) ──────────────────────────────────────────────────────
const CUSTOMERS = [
  { id: 'cus_ada',    name: 'Ada Obi',       email: 'ada@nollybox.tv',    phone: '+2348030000001', external_ref: 'user_1001', balance: '0',        created_at: iso(-90) },
  { id: 'cus_chidi',  name: 'Chidi Nwosu',   email: 'chidi@example.com',  phone: '+2348030000002', external_ref: 'user_1002', balance: '150000',   created_at: iso(-80) }, // ₦1,500 credit
  { id: 'cus_bola',   name: 'Bola Adeyemi',  email: 'bola@example.com',   phone: null,             external_ref: 'user_1003', balance: '-290000',  created_at: iso(-70) }, // owes ₦2,900, email-only
  { id: 'cus_emeka',  name: 'Emeka Eze',     email: 'emeka@example.com',  phone: '+2348030000004', external_ref: 'user_1004', balance: '-1200000', created_at: iso(-60) },
  { id: 'cus_uche',   name: 'Uche Okafor',   email: 'uche@example.com',   phone: '+2348030000005', external_ref: 'user_1005', balance: '-100000',  created_at: iso(-55) },
  { id: 'cus_ngozi',  name: 'Ngozi Ibe',     email: 'ngozi@example.com',  phone: '+2348030000006', external_ref: 'user_1006', balance: '-1200000', created_at: iso(-50) },
  { id: 'cus_tunde',  name: 'Tunde Bello',   email: 'tunde@example.com',  phone: '+2348030000007', external_ref: 'user_1007', balance: '0',        created_at: iso(-20) }, // trialing, no VA
  { id: 'cus_kemi',   name: 'Kemi Johnson',  email: 'kemi@example.com',   phone: '+2348030000008', external_ref: 'user_1008', balance: '-100000',  created_at: iso(-15) },
  { id: 'cus_zainab', name: 'Zainab Musa',   email: 'zainab@example.com', phone: '+2348030000009', external_ref: 'user_1009', balance: '0',        created_at: iso(-40) }, // canceled
];
// Some customers have a provisioned virtual account, some don't (to show both states).
const VA: Record<string, VirtualAccount | null> = {
  cus_ada:   { id: 'va_1', customer_id: 'cus_ada',   account_number: '9154353897', bank_name: 'Nombank MFB', account_name: 'NOLLYBOX/ADA OBI',      account_ref: 'ada-va',   created_at: iso(-88) },
  cus_emeka: { id: 'va_2', customer_id: 'cus_emeka', account_number: '9188220114', bank_name: 'Nombank MFB', account_name: 'NOLLYBOX/EMEKA EZE',    account_ref: 'emeka-va', created_at: iso(-58) },
  cus_bola:  { id: 'va_3', customer_id: 'cus_bola',  account_number: '9133440765', bank_name: 'Nombank MFB', account_name: 'NOLLYBOX/BOLA ADEYEMI', account_ref: 'bola-va',  created_at: iso(-68) },
  cus_tunde: null, // no VA yet → shows the "Provision virtual account" state
};

// ── Plans ──────────────────────────────────────────────────────────────────────────────────────────
const PLAN_GROUP = { id: 'pg_1', name: 'Nollybox Plans', description: 'Streaming tiers', created_at: iso(-110) };
const PLANS = [
  { id: 'plan_basic',    plan_group_id: 'pg_1', name: 'Basic',    amount_minor: '100000',  interval: 'month', interval_count: 1, trial_period_days: 0,  lookup_key: 'basic',    active: true, created_at: iso(-110) },
  { id: 'plan_standard', plan_group_id: 'pg_1', name: 'Standard', amount_minor: '290000',  interval: 'month', interval_count: 1, trial_period_days: 0,  lookup_key: 'standard', active: true, created_at: iso(-110) },
  { id: 'plan_pro',      plan_group_id: 'pg_1', name: 'Pro',      amount_minor: '1200000', interval: 'month', interval_count: 1, trial_period_days: 0,  lookup_key: 'pro',      active: true, created_at: iso(-110) },
  { id: 'plan_annual',   plan_group_id: 'pg_1', name: 'Annual',   amount_minor: '5000000', interval: 'year',  interval_count: 1, trial_period_days: 14, lookup_key: 'annual',   active: true, created_at: iso(-110) },
];
// ── Subscriptions (every lifecycle state; metadata drives the dunning board) ────────────────────────
type Meta = Record<string, unknown>;
function sub(o: {
  id: string; customer_id: string; plan_id: string; state: string; rail?: string;
  has_card?: boolean; period_end?: number; next_bill?: number; trial_end?: number | null;
  cancel_at_period_end?: boolean; canceled_at?: number | null; metadata?: Meta; scheduled_change?: unknown;
}) {
  return {
    object: 'subscription', id: o.id, customer_id: o.customer_id, plan_id: o.plan_id, state: o.state,
    quantity: 1, preferred_rail: o.rail ?? 'card',
    current_period_start: iso(-15), current_period_end: iso(o.period_end ?? 15),
    next_bill_at: iso(o.next_bill ?? 15), trial_end_at: o.trial_end != null ? iso(o.trial_end) : null,
    cancel_at_period_end: o.cancel_at_period_end ?? false, canceled_at: o.canceled_at != null ? iso(o.canceled_at) : null,
    has_card: o.has_card ?? true, metadata: o.metadata ?? {}, created_at: iso(-60),
    scheduled_change: o.scheduled_change ?? null,
  };
}
const SUBSCRIPTIONS = [
  sub({ id: 'sub_ada',    customer_id: 'cus_ada',    plan_id: 'plan_standard', state: 'active',    rail: 'transfer', has_card: false }),
  sub({ id: 'sub_chidi',  customer_id: 'cus_chidi',  plan_id: 'plan_pro',      state: 'active',    rail: 'card' }),
  sub({ id: 'sub_sch',    customer_id: 'cus_chidi',  plan_id: 'plan_pro',      state: 'active',    rail: 'card', cancel_at_period_end: true, scheduled_change: { new_plan_id: 'plan_standard', effective_at: iso(15) } }),
  // Past due — soft decline (retryable) vs hard decline
  sub({ id: 'sub_bola',   customer_id: 'cus_bola',   plan_id: 'plan_standard', state: 'past_due',  rail: 'card', metadata: { declineCode: 'INSUFFICIENT_FUNDS', dunningNextRetryAt: iso(2), dunningAttempts: 1 } }),
  sub({ id: 'sub_kemi',   customer_id: 'cus_kemi',   plan_id: 'plan_basic',    state: 'past_due',  rail: 'card', metadata: { declineCode: 'CARD_DECLINED',      dunningNextRetryAt: iso(1), dunningAttempts: 3 } }),
  // Grace — red bar (2 left) vs green bar (6 left)
  sub({ id: 'sub_emeka',  customer_id: 'cus_emeka',  plan_id: 'plan_pro',      state: 'grace',     rail: 'card', metadata: { enteredGraceAt: iso(-5) } }),
  sub({ id: 'sub_uche',   customer_id: 'cus_uche',   plan_id: 'plan_standard', state: 'grace',     rail: 'card', metadata: { enteredGraceAt: iso(-1) } }),
  // Delinquent
  sub({ id: 'sub_ngozi',  customer_id: 'cus_ngozi',  plan_id: 'plan_pro',      state: 'delinquent',rail: 'card', metadata: { enteredDelinquentAt: iso(-10) } }),
  // Trialing / incomplete / canceled
  sub({ id: 'sub_tunde',  customer_id: 'cus_tunde',  plan_id: 'plan_annual',   state: 'trialing',  rail: 'card', trial_end: 9 }),
  sub({ id: 'sub_incmp',  customer_id: 'cus_kemi',   plan_id: 'plan_pro',      state: 'incomplete',rail: 'card', has_card: false }),
  sub({ id: 'sub_zainab', customer_id: 'cus_zainab', plan_id: 'plan_standard', state: 'canceled',  rail: 'card', canceled_at: -3 }),
];

// ── Entitlements (derived per customer) ──────────────────────────────────────────────────────────
const FEATURES: Record<string, string[]> = {
  plan_basic:    ['SD streaming', '1 screen'],
  plan_standard: ['HD streaming', '2 screens', 'Downloads'],
  plan_pro:      ['4K streaming', '4 screens', 'Downloads', 'Offline'],
  plan_annual:   ['4K streaming', '4 screens', 'Downloads', 'Offline', 'Annual saver'],
};
function entFor(customerId: string) {
  const s = SUBSCRIPTIONS.find((x) => x.customer_id === customerId && x.state !== 'canceled');
  if (!s) return { subscription_id: null, state: null, has_access: false, tier: null, features: null };
  const hasAccess = ['active', 'trialing', 'past_due', 'grace'].includes(s.state);
  const plan = PLANS.find((p) => p.id === s.plan_id);
  return { subscription_id: s.id, state: s.state, has_access: hasAccess, tier: plan?.name ?? null, features: hasAccess ? (FEATURES[s.plan_id] ?? []) : [] };
}

// ── Invoices (every state; advance + arrears) ─────────────────────────────────────────────────────
const INVOICES = [
  { id: 'inv_1', customer_id: 'cus_ada',   subscription_id: 'sub_ada',   state: 'paid',          currency: 'NGN', amount_due: '290000',  amount_paid: '290000', period_start: iso(-15), period_end: iso(15),  due_at: iso(-15), billing_mode: 'advance', closed_at: iso(-15), created_at: iso(-15) },
  { id: 'inv_2', customer_id: 'cus_chidi', subscription_id: 'sub_chidi', state: 'paid',          currency: 'NGN', amount_due: '1200000', amount_paid: '1200000',period_start: iso(-15), period_end: iso(15),  due_at: iso(-15), billing_mode: 'advance', closed_at: iso(-15), created_at: iso(-15) },
  { id: 'inv_3', customer_id: 'cus_bola',  subscription_id: 'sub_bola',  state: 'open',          currency: 'NGN', amount_due: '290000',  amount_paid: '0',      period_start: iso(-2),  period_end: iso(28),  due_at: iso(-2),  billing_mode: 'advance', closed_at: null,     created_at: iso(-2) },
  { id: 'inv_4', customer_id: 'cus_emeka', subscription_id: 'sub_emeka', state: 'open',          currency: 'NGN', amount_due: '1200000', amount_paid: '0',      period_start: iso(-5),  period_end: iso(25),  due_at: iso(-5),  billing_mode: 'arrears', closed_at: null,     created_at: iso(-5) },
  { id: 'inv_5', customer_id: 'cus_ngozi', subscription_id: 'sub_ngozi', state: 'uncollectible', currency: 'NGN', amount_due: '1200000', amount_paid: '0',      period_start: iso(-40), period_end: iso(-10), due_at: iso(-40), billing_mode: 'advance', closed_at: iso(-10), created_at: iso(-40) },
  { id: 'inv_6', customer_id: 'cus_zainab',subscription_id: 'sub_zainab',state: 'void',          currency: 'NGN', amount_due: '290000',  amount_paid: '0',      period_start: iso(-30), period_end: iso(0),   due_at: iso(-30), billing_mode: 'advance', closed_at: iso(-3),  created_at: iso(-30) },
];

// ── Notifications (every event type + sent/failed/muted combos) ────────────────────────────────────
function notif(o: { id: string; cid: string; event: string; sms?: string | null; email?: string | null; msg: string; when: number }) {
  return {
    object: 'notification', id: o.id, customer_id: o.cid, event_type: o.event, message: o.msg,
    sms_to: o.sms !== undefined ? '+234803000000X' : null, sms_status: o.sms ?? null,
    email_to: o.email !== undefined ? `${o.cid}@example.com` : null, email_status: o.email ?? null,
    created_at: iso(o.when),
  };
}
const NOTIFICATIONS = [
  notif({ id: 'ntl_1',  cid: 'cus_ada',   event: 'payment_due', sms: 'sent',   email: 'sent',   when: -1,  msg: 'Nollybox: your subscription payment of ₦2,900 is due. Transfer to 9154353897 (Nombank MFB) to keep your plan active.' }),
  notif({ id: 'ntl_2',  cid: 'cus_bola',  event: 'past_due',    sms: 'failed', email: 'sent',   when: -2,  msg: "Nollybox: we couldn't collect your subscription payment. Please update your payment to avoid losing access." }),
  notif({ id: 'ntl_3',  cid: 'cus_ngozi', event: 'delinquent',  sms: 'sent',   email: 'sent',   when: -3,  msg: 'Nollybox: your subscription is now on hold for non-payment. Pay now to restore access.' }),
  notif({ id: 'ntl_4',  cid: 'cus_ada',   event: 'recovered',   sms: 'sent',   email: 'sent',   when: -4,  msg: 'Nollybox: payment received — your subscription is active again. Thank you!' }),
  notif({ id: 'ntl_5',  cid: 'cus_chidi', event: 'recovered',   sms: 'sent',   email: 'sent',   when: -6,  msg: 'Nollybox: payment received — your subscription is active again. Thank you!' }),
  notif({ id: 'ntl_6',  cid: 'cus_tunde', event: 'activated',   sms: null,     email: 'sent',   when: -7,  msg: 'Nollybox: your subscription is active. Welcome aboard — thank you for subscribing!' }),
  notif({ id: 'ntl_7',  cid: 'cus_chidi', event: 'receipt',     sms: 'sent',   email: 'sent',   when: -8,  msg: 'Nollybox: payment of ₦12,000 received. Your subscription is renewed — thank you!' }),
  notif({ id: 'ntl_8',  cid: 'cus_tunde', event: 'trial_ended', sms: undefined,email: 'sent',   when: -9,  msg: 'Nollybox: your free trial has ended and your subscription is now active.' }),
  notif({ id: 'ntl_9',  cid: 'cus_zainab',event: 'canceled',    sms: 'sent',   email: 'sent',   when: -3,  msg: 'Nollybox: your subscription has been canceled. We are sorry to see you go.' }),
  notif({ id: 'ntl_10', cid: 'cus_ada',   event: 'reminder',    sms: 'sent',   email: 'sent',   when: 0,   msg: 'Nollybox: a reminder that your subscription payment is due. Please pay to keep your plan active.' }),
  notif({ id: 'ntl_11', cid: 'cus_kemi',  event: 'past_due',    sms: 'failed', email: 'failed', when: -1,  msg: "Nollybox: we couldn't collect your subscription payment." }),
];

// ── Webhook endpoints + deliveries (every delivery status) ──────────────────────────────────────────
const WEBHOOK_ENDPOINTS: WebhookEndpoint[] = [
  { id: 'we_1', url: 'https://api.nollybox.tv/webhooks/plinth', description: 'Production listener', enabled: true,  event_types: ['subscription.activated', 'invoice.paid', 'subscription.past_due', 'subscription.canceled'], created_at: iso(-100), updated_at: iso(-2) },
  { id: 'we_2', url: 'https://staging.nollybox.tv/hooks',       description: 'Staging (paused)',     enabled: false, event_types: ['*'], created_at: iso(-60), updated_at: iso(-30) },
];
const DELIVERIES: Record<string, WebhookDelivery[]> = {
  we_1: [
    { id: 'wd_1', endpoint_id: 'we_1', event_id: 'evt_1', event_type: 'invoice.paid',            status: 'succeeded', attempts: 1, response_code: 200, error: null,                 next_retry_at: null,     last_attempt_at: iso(-1), created_at: iso(-1) },
    { id: 'wd_2', endpoint_id: 'we_1', event_id: 'evt_2', event_type: 'subscription.past_due',   status: 'failed',    attempts: 4, response_code: 500, error: 'Upstream 500',         next_retry_at: null,     last_attempt_at: iso(-1), created_at: iso(-1) },
    { id: 'wd_3', endpoint_id: 'we_1', event_id: 'evt_3', event_type: 'subscription.activated',  status: 'retrying',  attempts: 2, response_code: 503, error: 'Service unavailable',  next_retry_at: iso(0.02),last_attempt_at: iso(0), created_at: iso(0) },
    { id: 'wd_4', endpoint_id: 'we_1', event_id: 'evt_4', event_type: 'subscription.canceled',   status: 'pending',   attempts: 0, response_code: null,error: null,                 next_retry_at: iso(0.01),last_attempt_at: null,   created_at: iso(0) },
  ],
  we_2: [],
};

// ── Misc single-record fixtures ─────────────────────────────────────────────────────────────────────
const KEYS = [
  { id: 'key_1', prefix: 'sk_live_a1b2', mode: 'live', created_at: iso(-100), revoked_at: null },
  { id: 'key_2', prefix: 'sk_test_c3d4', mode: 'test', created_at: iso(-100), revoked_at: null },
  { id: 'key_3', prefix: 'sk_live_old0', mode: 'live', created_at: iso(-200), revoked_at: iso(-90) },
];
const SUSPENSE = listOf([
  { id: 'sus_1', tenant_id: TENANT.id, amount_minor: '50000',  account_ref: '9154353897', narration: 'TRF/UNKNOWN REF',      nomba_request_id: 'req_a1', reason: 'no_matching_invoice', created_at: iso(-1) },
  { id: 'sus_2', tenant_id: TENANT.id, amount_minor: '120000', account_ref: '9188220114', narration: 'PARTIAL PAYMENT',      nomba_request_id: 'req_a2', reason: 'amount_mismatch',     created_at: iso(-2) },
]);
const POLICY = {
  object: 'policy', activation_strategy: 'activate_then_charge', billing_mode: 'advance',
  upgrade_strategy: 'immediate_prorated', downgrade_strategy: 'at_period_end', change_during_dunning: 'gate_upgrades',
  cancel_policy: 'end_of_period', grace_days: 7, delinquent_cancel_days: 30, max_debt_minor: '500000',
  max_dunning_attempts: 4, allow_multiple_subscriptions: false,
};
const NOTIFICATION_SETTINGS = { object: 'notification_settings', sms_enabled: true, email_enabled: true, brand_override: null, disabled_events: ['receipt'] };
const CLOCK = { mode: 'test', simulated_now: iso(0), updated_at: iso(0) };
// NOTE: the admin/tenants page reads camelCase fields (matches the real /admin/applications shape).
const APPLICATIONS = listOf([
  { id: 'app_1', businessName: 'Naija Streams', contactName: 'Ify Okoro', email: 'ify@naijastreams.com', status: 'pending',  rcNumber: 'RC1234567', website: 'https://naijastreams.com', description: 'A Nollywood streaming service for the diaspora.', nombaSubAccountId: null,          tenantId: null,          rejectionReason: null, reviewedAt: null,     createdAt: iso(-1) },
  { id: 'app_2', businessName: 'GymHub Lagos',  contactName: 'Tola Bright',email: 'tola@gymhub.ng',      status: 'pending',  rcNumber: 'RC9988776', website: 'https://gymhub.ng',       description: 'Monthly gym memberships across 6 branches.',       nombaSubAccountId: null,          tenantId: null,          rejectionReason: null, reviewedAt: null,     createdAt: iso(-2) },
  { id: 'app_3', businessName: 'FitClub NG',    contactName: 'Sola Ade',   email: 'sola@fitclub.ng',     status: 'approved', rcNumber: 'RC7654321', website: 'https://fitclub.ng',      description: 'Fitness class subscriptions.',                     nombaSubAccountId: 'sub_acc_9f2', tenantId: 'ten_fitclub', rejectionReason: null, reviewedAt: iso(-9),  createdAt: iso(-10) },
  { id: 'app_4', businessName: 'ShadyDeals',    contactName: 'John Doe',   email: 'john@shady.co',       status: 'rejected', rcNumber: null,        website: null,                       description: 'Unclear business model.',                          nombaSubAccountId: null,          tenantId: null,          rejectionReason: 'Insufficient business information provided.', reviewedAt: iso(-19), createdAt: iso(-20) },
]);

// ── The mock API (same shape as the real `api`) ──────────────────────────────────────────────────────
export const mockApi = {
  me: { get: () => P(TENANT) },
  customers: {
    list:              () => P(listOf(CUSTOMERS)),
    get:               (id: string) => P(CUSTOMERS.find((c) => c.id === id) ?? CUSTOMERS[0]),
    entitlements:      (id: string) => P(entFor(id)),
    create:            (_d: unknown) => P({ ...CUSTOMERS[0], object: 'customer', id: `cus_new_${Date.now()}` }),
    virtualAccount:    (id: string) => P(VA[id] ?? { id: 'va_new', customer_id: id, account_number: '9100000000', bank_name: 'Nombank MFB', account_name: 'NOLLYBOX/NEW', account_ref: 'new-va', created_at: iso(0) }),
    getVirtualAccount: (id: string) => P(VA[id] ?? null),
  },
  subscriptions: {
    list:          () => P(listOf(SUBSCRIPTIONS)),
    get:           (id: string) => P(SUBSCRIPTIONS.find((s) => s.id === id) ?? SUBSCRIPTIONS[0]),
    status:        (id: string) => P({ subscription_id: id, state: 'active', has_access: true }),
    create:        (_d: unknown) => P(SUBSCRIPTIONS[0]),
    checkoutLink:  (id: string) => P({ checkoutLink: 'https://checkout.nomba.com/mock', orderReference: 'ord_mock', customerId: 'cus_ada', subscriptionId: id }),
    previewChange: (_id: string, _d: unknown) => P({ object: 'preview', proration_minor: '145000' }),
    change:        (_id: string, _d: unknown) => P({ object: 'subscription', changed: true }),
  },
  plans: {
    list:   () => P(listOf(PLANS)),
    create: (_d: unknown) => P(PLANS[0]),
    update: (_id: string, _d: unknown) => P(PLANS[0]),
    remove: (_id: string) => P({ archived: true, deleted: false }),
  },
  invoices: { list: () => P(listOf(INVOICES)) },
  notifications: {
    list:   (customerId?: string) => P(listOf(customerId ? NOTIFICATIONS.filter((n) => n.customer_id === customerId) : NOTIFICATIONS)),
    remind: (_customerId: string) => P({ object: 'notification_reminder', ok: true }),
  },
  notificationSettings: {
    get:    () => P(NOTIFICATION_SETTINGS),
    update: (_d: unknown) => P({ object: 'notification_settings', updated: true }),
    test:   (_channel: 'sms' | 'email', _to: string) => P({ object: 'notification_test', ok: true }),
  },
  policy: {
    get:         () => P(POLICY),
    update:      (_d: unknown) => P(POLICY),
    applyPreset: (_p: string) => P(POLICY),
  },
  webhooks: { simulatePayment: (_o: string, _a: number) => P({ ok: true }) },
  planGroups: { list: () => P(listOf([PLAN_GROUP])), create: (_d: unknown) => P(PLAN_GROUP) },
  clock: {
    get:     () => P(CLOCK),
    advance: (advanceSeconds: number) => P({ ...CLOCK, simulated_now: iso(advanceSeconds / 86_400), advanced_by_seconds: advanceSeconds }),
    reset:   () => P({ object: 'clock_state', mode: 'real', simulated_now: null }),
  },
  tick: { run: () => P({ object: 'tick_result', renewed: 3, trials_converted: 1, failed: 1, dunning_retried: 2, dunning_recovered: 1, grace_expired: 0, delinquent_canceled: 0, sandboxes_purged: 0 }) },
  suspense: { list: () => P(SUSPENSE), resolve: (_id: string, _n: string) => P({ object: 'suspense_item', resolved: true }) },
  sandbox: { create: (_d: unknown) => P({ ok: true }) },
  auth: {
    claim:     (_t: string) => P({ tenant_id: TENANT.id, api_key: 'sk_live_mock' }),
    magicLink: (_e: string) => P({ ok: true }),
  },
  keys: {
    list:   () => P(listOf(KEYS)),
    create: (_m: 'live' | 'test') => P({ api_key: 'sk_live_mockKEY1234567890', id: `key_${Date.now()}`, prefix: 'sk_live_mock' }),
    revoke: (_id: string) => P({ revoked: true }),
  },
  webhookEndpoints: {
    list:       () => P({ data: WEBHOOK_ENDPOINTS }),
    create:     (d: { url: string; description?: string; event_types?: string[] }) => P({ id: `we_${Date.now()}`, url: d.url, description: d.description ?? null, enabled: true, event_types: d.event_types ?? ['*'], secret: 'whsec_mock1234567890', created_at: iso(0), updated_at: iso(0) } as WebhookEndpoint),
    update:     (id: string, _d: unknown) => P(WEBHOOK_ENDPOINTS.find((e) => e.id === id) ?? WEBHOOK_ENDPOINTS[0]),
    rotate:     (id: string) => P({ ...(WEBHOOK_ENDPOINTS.find((e) => e.id === id) ?? WEBHOOK_ENDPOINTS[0]), secret: 'whsec_rotated1234567890' }),
    remove:     (_id: string) => P({ deleted: true }),
    deliveries: (id: string) => {
      const data = DELIVERIES[id] ?? [];
      const counts = data.reduce<Record<string, number>>((a, d) => ({ ...a, [d.status]: (a[d.status] ?? 0) + 1 }), {});
      return P({ counts, data });
    },
    resend:     (_id: string, _dId: string) => P({ resent: true }),
  },
  applications: { submit: (_d: unknown) => P({ ok: true, id: 'app_new' }) },
  adminApplications: {
    list:    () => P(APPLICATIONS),
    approve: (_id: string, _acc: string) => P({ tenantId: 'ten_new_mock' }),
    reject:  (_id: string, _r: string) => P({ ok: true }),
  },
};

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
