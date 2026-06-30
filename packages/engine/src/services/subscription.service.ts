import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { CustomerRepo } from '../db/customer.repo.js';
import type { PlanRepo } from '../db/catalog.repo.js';
import type { SubscriptionRepo, Subscription, SubscriptionState } from '../db/subscription.repo.js';
import type { EventRepo, OutboxEvent } from '../db/event.repo.js';
import type { TenantPolicyRepo } from '../db/policy.repo.js';
import { NotFoundError, PlanInactiveError } from '../domain/errors.js';
import { addInterval, addDays } from '../domain/period.js';

export interface CreateSubscriptionInput {
  tenantId: string;
  customerId: string;
  planId: string;
  quantity?: number;
  defaultPaymentMethodId?: string;
  preferredRail?: 'card' | 'transfer' | 'direct_debit';
  billingMode?: 'advance' | 'arrears';
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  state: SubscriptionState;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndAt: Date | null;
  nextBillAt: Date;
}

export class CreateSubscriptionService {
  constructor(
    private readonly customerRepo: CustomerRepo,
    private readonly planRepo: PlanRepo,
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly eventRepo: EventRepo,
    private readonly policyRepo: TenantPolicyRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
    const now = this.clock.now();

    const [customer, plan] = await Promise.all([
      this.customerRepo.findById(input.tenantId, input.customerId),
      this.planRepo.findById(input.tenantId, input.planId),
    ]);

    if (!customer) throw new NotFoundError('Customer', input.customerId);
    if (!plan) throw new NotFoundError('Plan', input.planId);
    if (!plan.active) throw new PlanInactiveError(input.planId);

    const subId = `sub_${ulid()}`;
    const hasTrial = plan.trialPeriodDays > 0;
    const policy = await this.policyRepo.findByTenantId(input.tenantId);
    const billingMode = input.billingMode ?? policy.billingMode;

    let trialEndAt: Date | null = null;
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let state: SubscriptionState;

    if (hasTrial) {
      // Trial always grants trial access; the activation strategy is applied when the trial ends.
      state = 'trialing';
      trialEndAt = addDays(now, plan.trialPeriodDays);
      currentPeriodStart = now;
      currentPeriodEnd = trialEndAt;
    } else {
      currentPeriodStart = now;
      currentPeriodEnd = addInterval(now, plan.billingInterval, plan.billingIntervalCount);
      if (billingMode === 'arrears') {
        // Arrears: use now, pay at the end of the period — no upfront charge, access granted.
        state = 'active';
      } else {
        // Advance: honour the activation strategy.
        //  - charge_to_activate (strict): incomplete (no access) until the first payment clears.
        //  - activate_then_charge (optimistic): grant access now; first payment via checkout.
        state = policy.activationStrategy === 'charge_to_activate' ? 'incomplete' : 'active';
      }
    }

    // Incomplete (strict) → first payment due immediately (at checkout); otherwise bill at the
    // period boundary (trial end, or end of period 1 for both advance-renewal and arrears).
    const nextBillAt = hasTrial ? trialEndAt! : (state === 'incomplete' ? now : currentPeriodEnd);

    const subscription: Subscription = {
      id:                     subId,
      tenantId:               input.tenantId,
      customerId:             input.customerId,
      planId:                 input.planId,
      state,
      billingMode,
      quantity:               input.quantity ?? 1,
      defaultPaymentMethodId: input.defaultPaymentMethodId ?? null,
      preferredRail:          input.preferredRail ?? 'card',
      currentPeriodStart,
      currentPeriodEnd,
      nextBillAt,
      trialEndAt,
      pausedAt:               null,
      canceledAt:             null,
      metadata:               input.metadata ?? {},
      createdAt:              now,
      updatedAt:              now,
    };

    const event: OutboxEvent = {
      id:           `evt_${ulid()}`,
      tenantId:     input.tenantId,
      type:         'subscription.created',
      resourceType: 'subscription',
      resourceId:   subId,
      payload: {
        id:                 subId,
        customerId:         input.customerId,
        planId:             input.planId,
        state,
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodEnd:   currentPeriodEnd.toISOString(),
        trialEndAt:         trialEndAt?.toISOString() ?? null,
      },
      occurredAt: now,
      createdAt:  now,
    };

    await this.uow.run(async (tx) => {
      await this.subscriptionRepo.create(subscription, tx);
      await this.eventRepo.append(event, tx);
    });

    return { subscriptionId: subId, state, currentPeriodStart, currentPeriodEnd, trialEndAt, nextBillAt };
  }
}
