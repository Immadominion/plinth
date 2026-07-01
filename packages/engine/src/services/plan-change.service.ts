import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { SubscriptionRepo } from '../db/subscription.repo.js';
import type { InvoiceRepo, InvoiceLineItem } from '../db/invoice.repo.js';
import type { PlanRepo } from '../db/catalog.repo.js';
import type { EventRepo } from '../db/event.repo.js';
import type { ScheduledChangeRepo } from '../db/scheduled-change.repo.js';
import type { TenantPolicyRepo } from '../db/policy.repo.js';
import type { PostLedgerEntryService } from './ledger.service.js';
import type { ChargeCardService } from './billing.service.js';
import { computeProration } from '../domain/proration.js';
import { NotFoundError, InvalidRequestError, CardError } from '../domain/errors.js';
import type { SubscriptionState } from '../domain/state-machines/subscription.js';

const DUNNING_STATES: SubscriptionState[] = ['past_due', 'grace', 'delinquent'];

export interface PreviewChangeResult {
  direction: string;
  strategy: string;
  lineItems: Array<{ type: string; description: string; amountMinor: string }>;
  dueNowMinor: string;
  creditMinor: string;
  scheduledFor: string | null;
  nextInvoiceMinor: string;
}

export interface CommitChangeResult {
  subscriptionId: string;
  planId: string;
  quantity: number;
  strategy: string;
  direction: string;
  invoiceId: string | null;
  amountChargedMinor: string | null;
  creditAppliedMinor: string | null;
  scheduledFor: string | null;
}

export interface CheckoutChangeResult {
  subscriptionId: string;
  newPlanId: string;
  newQuantity: number;
  direction: string;
  dueMinor: string;
  oldPlanName: string;
  newPlanName: string;
}

export class PlanChangeService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly planRepo: PlanRepo,
    private readonly invoiceRepo: InvoiceRepo,
    private readonly eventRepo: EventRepo,
    private readonly scheduledChangeRepo: ScheduledChangeRepo,
    private readonly policyRepo: TenantPolicyRepo,
    private readonly chargeCardService: ChargeCardService,
    private readonly postLedgerEntry: PostLedgerEntryService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async previewChange(params: {
    tenantId: string;
    subscriptionId: string;
    newPlanId: string;
    newQuantity?: number;
  }): Promise<PreviewChangeResult> {
    const { tenantId, subscriptionId, newPlanId } = params;

    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);

    const [oldPlan, newPlan, policy] = await Promise.all([
      this.planRepo.findById(tenantId, sub.planId),
      this.planRepo.findById(tenantId, newPlanId),
      this.policyRepo.findByTenantId(tenantId),
    ]);
    if (!oldPlan) throw new NotFoundError('Plan', sub.planId);
    if (!newPlan) throw new NotFoundError('Plan', newPlanId);

    const newQuantity = params.newQuantity ?? sub.quantity;
    const now = this.clock.now();

    if (sub.state === 'trialing') {
      return {
        direction: 'lateral', strategy: 'at_trial_end', lineItems: [],
        dueNowMinor: '0', creditMinor: '0',
        scheduledFor: sub.trialEndAt?.toISOString() ?? null,
        nextInvoiceMinor: (newPlan.amountMinor * BigInt(newQuantity)).toString(),
      };
    }

    const proration = computeProration({
      oldAmountMinor: oldPlan.amountMinor, newAmountMinor: newPlan.amountMinor,
      oldQuantity: sub.quantity, newQuantity,
      periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd, now,
    });

    // Lateral: always immediate, no money movement
    if (proration.direction === 'lateral') {
      return {
        direction: 'lateral', strategy: 'immediate_prorated', lineItems: [],
        dueNowMinor: '0', creditMinor: '0', scheduledFor: null,
        nextInvoiceMinor: (newPlan.amountMinor * BigInt(newQuantity)).toString(),
      };
    }

    const strategy = proration.direction === 'upgrade' ? policy.upgradeStrategy : policy.downgradeStrategy;
    const dueNowMinor  = strategy === 'at_period_end' ? 0n : (proration.netMinor > 0n ? proration.netMinor : 0n);
    const creditMinor  = strategy === 'at_period_end' ? 0n : (proration.netMinor < 0n ? -proration.netMinor : 0n);

    return {
      direction: proration.direction, strategy,
      lineItems: proration.lineItems.map((li) => ({
        type: li.type, description: li.description, amountMinor: li.amountMinor.toString(),
      })),
      dueNowMinor: dueNowMinor.toString(), creditMinor: creditMinor.toString(),
      scheduledFor: strategy === 'at_period_end' ? sub.currentPeriodEnd.toISOString() : null,
      nextInvoiceMinor: (newPlan.amountMinor * BigInt(newQuantity)).toString(),
    };
  }

  async commitChange(params: {
    tenantId: string;
    subscriptionId: string;
    newPlanId: string;
    newQuantity?: number;
  }): Promise<CommitChangeResult> {
    const { tenantId, subscriptionId, newPlanId } = params;
    const now = this.clock.now();

    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);

    const [oldPlan, newPlan, policy] = await Promise.all([
      this.planRepo.findById(tenantId, sub.planId),
      this.planRepo.findById(tenantId, newPlanId),
      this.policyRepo.findByTenantId(tenantId),
    ]);
    if (!oldPlan) throw new NotFoundError('Plan', sub.planId);
    if (!newPlan) throw new NotFoundError('Plan', newPlanId);

    const newQuantity = params.newQuantity ?? sub.quantity;

    // Trial: swap plan with no charge
    if (sub.state === 'trialing') {
      await this.uow.run(async (tx) => {
        const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
        if (!locked || locked.state !== 'trialing') return;
        await this.subscriptionRepo.update({ ...locked, planId: newPlanId, quantity: newQuantity, updatedAt: now }, tx);
        await this.eventRepo.append({
          id: `evt_${ulid()}`, tenantId, type: 'subscription.plan_changed',
          resourceType: 'subscription', resourceId: sub.id,
          payload: { subscriptionId: sub.id, fromPlanId: sub.planId, toPlanId: newPlanId, direction: 'lateral', effectiveAt: 'trial_end' },
          occurredAt: now, createdAt: now,
        }, tx);
      });
      return { subscriptionId: sub.id, planId: newPlanId, quantity: newQuantity, strategy: 'at_trial_end', direction: 'lateral', invoiceId: null, amountChargedMinor: null, creditAppliedMinor: null, scheduledFor: sub.trialEndAt?.toISOString() ?? null };
    }

    const proration = computeProration({
      oldAmountMinor: oldPlan.amountMinor, newAmountMinor: newPlan.amountMinor,
      oldQuantity: sub.quantity, newQuantity,
      periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd, now,
    });

    // Dunning gate
    if (DUNNING_STATES.includes(sub.state)) {
      if (proration.direction === 'upgrade' && policy.changeDuringDunning === 'gate_upgrades') {
        throw new InvalidRequestError('change_blocked_dunning', `Cannot upgrade while subscription is ${sub.state}. Settle the outstanding balance first.`);
      }
      if (policy.changeDuringDunning === 'block_all') {
        throw new InvalidRequestError('change_blocked_dunning', `Plan changes are blocked while subscription is ${sub.state}.`);
      }
    }

    // Lateral swaps are always immediate (no money moves regardless of strategy)
    if (proration.direction === 'lateral') {
      await this.uow.run(async (tx) => {
        const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
        if (!locked) return;
        await this.subscriptionRepo.update({ ...locked, planId: newPlanId, quantity: newQuantity, updatedAt: now }, tx);
        await this.eventRepo.append({ id: `evt_${ulid()}`, tenantId, type: 'subscription.plan_changed', resourceType: 'subscription', resourceId: sub.id, payload: { subscriptionId: sub.id, fromPlanId: sub.planId, toPlanId: newPlanId, direction: 'lateral' }, occurredAt: now, createdAt: now }, tx);
      });
      return { subscriptionId: sub.id, planId: newPlanId, quantity: newQuantity, strategy: 'immediate_prorated', direction: 'lateral', invoiceId: null, amountChargedMinor: null, creditAppliedMinor: null, scheduledFor: null };
    }

    const strategy = proration.direction === 'upgrade' ? policy.upgradeStrategy : policy.downgradeStrategy;

    // at_period_end: schedule and return
    if (strategy === 'at_period_end') {
      const changeId = `scc_${ulid()}`;
      await this.uow.run(async (tx) => {
        await this.scheduledChangeRepo.create({
          id: changeId, tenantId, subscriptionId: sub.id,
          newPlanId, newQuantity, applyOn: 'period_end', scheduledFor: sub.currentPeriodEnd, dueMinor: null, createdAt: now,
        }, tx);
        await this.eventRepo.append({
          id: `evt_${ulid()}`, tenantId, type: 'subscription.plan_change_scheduled',
          resourceType: 'subscription', resourceId: sub.id,
          payload: { subscriptionId: sub.id, changeId, fromPlanId: sub.planId, toPlanId: newPlanId, direction: proration.direction, scheduledFor: sub.currentPeriodEnd.toISOString() },
          occurredAt: now, createdAt: now,
        }, tx);
      });
      return { subscriptionId: sub.id, planId: sub.planId, quantity: sub.quantity, strategy: 'at_period_end', direction: proration.direction, invoiceId: null, amountChargedMinor: null, creditAppliedMinor: null, scheduledFor: sub.currentPeriodEnd.toISOString() };
    }

    // immediate_prorated: net > 0 → charge, net < 0 → credit, net == 0 → neutral
    if (proration.netMinor > 0n) {
      if (!sub.defaultPaymentMethodId) {
        throw new InvalidRequestError('no_payment_method', 'No payment method on file. Add a card to proceed.');
      }
      const invoiceId = `inv_${ulid()}`;
      const charge = await this.chargeCardService.charge({
        tokenKey:       sub.defaultPaymentMethodId,
        amountMinor:    proration.netMinor,
        merchantTxRef: `proration_${invoiceId}`,
        description:    `Plan upgrade: ${oldPlan.name} → ${newPlan.name}`,
      });
      if (!charge.success) {
        throw new CardError('card_declined', `Card declined: ${charge.message}`, charge.declineCode);
      }
      await this.uow.run(async (tx) => {
        const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
        if (!locked) return;
        await this.invoiceRepo.create({
          id: invoiceId, tenantId, customerId: sub.customerId, subscriptionId: sub.id,
          state: 'paid', currency: 'NGN',
          amountDueMinor: proration.netMinor, amountPaidMinor: proration.netMinor,
          periodStart: now, periodEnd: locked.currentPeriodEnd,
          dueAt: now, billingMode: 'advance', isReceivable: false, closedAt: now,
          createdAt: now, updatedAt: now,
        }, tx);
        const lineItems: InvoiceLineItem[] = proration.lineItems.map((li) => ({
          id: `ili_${ulid()}`, tenantId, invoiceId,
          description: li.description, amountMinor: li.amountMinor,
          quantity: 1, type: 'proration' as const, createdAt: now,
        }));
        await this.invoiceRepo.createLineItems(lineItems, tx);
        await this.subscriptionRepo.update({ ...locked, planId: newPlanId, quantity: newQuantity, updatedAt: now }, tx);
        await this.postLedgerEntry.executeInTx({ tenantId, customerId: sub.customerId, type: 'payment_received', amountMinor: proration.netMinor, invoiceId, description: `Proration charge: ${oldPlan.name} → ${newPlan.name}` }, tx);
        await this.eventRepo.append({ id: `evt_${ulid()}`, tenantId, type: 'subscription.upgraded', resourceType: 'subscription', resourceId: sub.id, payload: { subscriptionId: sub.id, fromPlanId: sub.planId, toPlanId: newPlanId, invoiceId, amountMinor: proration.netMinor.toString() }, occurredAt: now, createdAt: now }, tx);
        await this.eventRepo.append({ id: `evt_${ulid()}`, tenantId, type: 'invoice.paid', resourceType: 'invoice', resourceId: invoiceId, payload: { invoiceId, subscriptionId: sub.id, amountMinor: proration.netMinor.toString() }, occurredAt: now, createdAt: now }, tx);
      });
      return { subscriptionId: sub.id, planId: newPlanId, quantity: newQuantity, strategy: 'immediate_prorated', direction: 'upgrade', invoiceId, amountChargedMinor: proration.netMinor.toString(), creditAppliedMinor: null, scheduledFor: null };

    } else if (proration.netMinor < 0n) {
      const creditAmount = -proration.netMinor;
      await this.uow.run(async (tx) => {
        const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
        if (!locked) return;
        await this.subscriptionRepo.update({ ...locked, planId: newPlanId, quantity: newQuantity, updatedAt: now }, tx);
        await this.postLedgerEntry.executeInTx({ tenantId, customerId: sub.customerId, type: 'downgrade_credit', amountMinor: creditAmount, description: `Proration credit: ${oldPlan.name} → ${newPlan.name}` }, tx);
        await this.eventRepo.append({ id: `evt_${ulid()}`, tenantId, type: 'subscription.downgraded', resourceType: 'subscription', resourceId: sub.id, payload: { subscriptionId: sub.id, fromPlanId: sub.planId, toPlanId: newPlanId, creditMinor: creditAmount.toString() }, occurredAt: now, createdAt: now }, tx);
      });
      return { subscriptionId: sub.id, planId: newPlanId, quantity: newQuantity, strategy: 'immediate_prorated', direction: proration.direction, invoiceId: null, amountChargedMinor: null, creditAppliedMinor: creditAmount.toString(), scheduledFor: null };

    } else {
      // net == 0: lateral swap, no money
      await this.uow.run(async (tx) => {
        const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
        if (!locked) return;
        await this.subscriptionRepo.update({ ...locked, planId: newPlanId, quantity: newQuantity, updatedAt: now }, tx);
        await this.eventRepo.append({ id: `evt_${ulid()}`, tenantId, type: 'subscription.plan_changed', resourceType: 'subscription', resourceId: sub.id, payload: { subscriptionId: sub.id, fromPlanId: sub.planId, toPlanId: newPlanId, direction: 'lateral' }, occurredAt: now, createdAt: now }, tx);
      });
      return { subscriptionId: sub.id, planId: newPlanId, quantity: newQuantity, strategy: 'immediate_prorated', direction: 'lateral', invoiceId: null, amountChargedMinor: null, creditAppliedMinor: null, scheduledFor: null };
    }
  }

  // No-card upgrade path: instead of charging a stored card token, record the intended change as
  // "apply when this checkout payment settles" (apply_on='payment') and return the amount to collect
  // via a Nomba-hosted checkout. Only meaningful when the change costs money now (upgrade, net > 0).
  async beginCheckoutChange(params: {
    tenantId: string;
    subscriptionId: string;
    newPlanId: string;
    newQuantity?: number;
  }): Promise<CheckoutChangeResult> {
    const { tenantId, subscriptionId, newPlanId } = params;
    const now = this.clock.now();

    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);

    const [oldPlan, newPlan, policy] = await Promise.all([
      this.planRepo.findById(tenantId, sub.planId),
      this.planRepo.findById(tenantId, newPlanId),
      this.policyRepo.findByTenantId(tenantId),
    ]);
    if (!oldPlan) throw new NotFoundError('Plan', sub.planId);
    if (!newPlan) throw new NotFoundError('Plan', newPlanId);

    if (sub.state === 'trialing') {
      throw new InvalidRequestError('no_payment_required', 'Trial plan changes take effect at trial end with no charge — use /change.');
    }

    const newQuantity = params.newQuantity ?? sub.quantity;
    const proration = computeProration({
      oldAmountMinor: oldPlan.amountMinor, newAmountMinor: newPlan.amountMinor,
      oldQuantity: sub.quantity, newQuantity,
      periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd, now,
    });

    // Same dunning gate as commitChange
    if (DUNNING_STATES.includes(sub.state)) {
      if (proration.direction === 'upgrade' && policy.changeDuringDunning === 'gate_upgrades') {
        throw new InvalidRequestError('change_blocked_dunning', `Cannot upgrade while subscription is ${sub.state}. Settle the outstanding balance first.`);
      }
      if (policy.changeDuringDunning === 'block_all') {
        throw new InvalidRequestError('change_blocked_dunning', `Plan changes are blocked while subscription is ${sub.state}.`);
      }
    }

    if (proration.netMinor <= 0n) {
      // Lateral or downgrade — nothing to collect now, so no checkout is needed.
      throw new InvalidRequestError('no_payment_required', 'This change requires no payment now — use /change instead.');
    }

    // Record the pending change; it stays inert until the payment webhook calls applyPaidChange.
    // onConflict (unique per sub) means a fresh attempt overwrites any prior pending change.
    const changeId = `scc_${ulid()}`;
    await this.scheduledChangeRepo.create({
      id: changeId, tenantId, subscriptionId: sub.id,
      newPlanId, newQuantity, applyOn: 'payment', scheduledFor: null, dueMinor: proration.netMinor, createdAt: now,
    });

    return {
      subscriptionId: sub.id, newPlanId, newQuantity,
      direction: proration.direction, dueMinor: proration.netMinor.toString(),
      oldPlanName: oldPlan.name, newPlanName: newPlan.name,
    };
  }

  // Called by the payment webhook when a checkout for a pending plan change settles. Swaps the plan
  // and records the proration as a paid invoice for the amount that was quoted at checkout time.
  // Idempotent: the pending row is deleted on apply, so a duplicate webhook is a no-op (returns false).
  async applyPaidChange(params: { tenantId: string; subscriptionId: string }): Promise<boolean> {
    const { tenantId, subscriptionId } = params;
    const now = this.clock.now();

    const pending = await this.scheduledChangeRepo.findPendingPaymentBySub(tenantId, subscriptionId);
    if (!pending) return false;

    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) return false;

    const [oldPlan, newPlan] = await Promise.all([
      this.planRepo.findById(tenantId, sub.planId),
      this.planRepo.findById(tenantId, pending.newPlanId),
    ]);
    if (!oldPlan || !newPlan) return false;

    const amount = pending.dueMinor ?? 0n;
    const invoiceId = `inv_${ulid()}`;

    await this.uow.run(async (tx) => {
      const locked = await this.subscriptionRepo.findForUpdate(tenantId, sub.id, tx);
      if (!locked) return;
      await this.invoiceRepo.create({
        id: invoiceId, tenantId, customerId: sub.customerId, subscriptionId: sub.id,
        state: 'paid', currency: 'NGN',
        amountDueMinor: amount, amountPaidMinor: amount,
        periodStart: now, periodEnd: locked.currentPeriodEnd,
        dueAt: now, billingMode: 'advance', isReceivable: false, closedAt: now,
        createdAt: now, updatedAt: now,
      }, tx);
      await this.invoiceRepo.createLineItems([{
        id: `ili_${ulid()}`, tenantId, invoiceId,
        description: `Plan upgrade: ${oldPlan.name} → ${newPlan.name}`, amountMinor: amount,
        quantity: 1, type: 'proration' as const, createdAt: now,
      }], tx);
      await this.subscriptionRepo.update({ ...locked, planId: pending.newPlanId, quantity: pending.newQuantity, updatedAt: now }, tx);
      await this.postLedgerEntry.executeInTx({ tenantId, customerId: sub.customerId, type: 'payment_received', amountMinor: amount, invoiceId, description: `Proration charge (checkout): ${oldPlan.name} → ${newPlan.name}` }, tx);
      await this.eventRepo.append({ id: `evt_${ulid()}`, tenantId, type: 'subscription.upgraded', resourceType: 'subscription', resourceId: sub.id, payload: { subscriptionId: sub.id, fromPlanId: sub.planId, toPlanId: pending.newPlanId, invoiceId, amountMinor: amount.toString(), via: 'checkout' }, occurredAt: now, createdAt: now }, tx);
      await this.eventRepo.append({ id: `evt_${ulid()}`, tenantId, type: 'invoice.paid', resourceType: 'invoice', resourceId: invoiceId, payload: { invoiceId, subscriptionId: sub.id, amountMinor: amount.toString() }, occurredAt: now, createdAt: now }, tx);
      await this.scheduledChangeRepo.delete(tenantId, pending.id, tx);
    });

    return true;
  }

  async cancelScheduledChange(params: {
    tenantId: string;
    subscriptionId: string;
    changeId: string;
  }): Promise<void> {
    const { tenantId, subscriptionId, changeId } = params;
    const now = this.clock.now();

    const change = await this.scheduledChangeRepo.findBySubscription(tenantId, subscriptionId);
    if (!change || change.id !== changeId) throw new NotFoundError('ScheduledChange', changeId);

    await this.uow.run(async (tx) => {
      await this.scheduledChangeRepo.delete(tenantId, changeId, tx);
      await this.eventRepo.append({
        id: `evt_${ulid()}`, tenantId, type: 'subscription.plan_change_canceled',
        resourceType: 'subscription', resourceId: subscriptionId,
        payload: { subscriptionId, changeId },
        occurredAt: now, createdAt: now,
      }, tx);
    });
  }
}
