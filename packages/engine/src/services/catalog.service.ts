import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { PlanGroupRepo, PlanGroup } from '../db/catalog.repo.js';
import type { PlanRepo, Plan } from '../db/catalog.repo.js';
import type { SubscriptionRepo } from '../db/subscription.repo.js';
import type { Kobo } from '../domain/money.js';
import type { BillingInterval } from '../domain/period.js';
import { NotFoundError, PlanImmutableError } from '../domain/errors.js';
import { assertNonNegative } from '../domain/money.js';

export interface CreatePlanGroupInput {
  tenantId: string;
  name: string;
  description?: string;
}

export interface CreatePlanGroupResult {
  planGroupId: string;
  name: string;
  createdAt: Date;
}

export class CreatePlanGroupService {
  constructor(
    private readonly planGroupRepo: PlanGroupRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreatePlanGroupInput): Promise<CreatePlanGroupResult> {
    const now = this.clock.now();
    const id = `pg_${ulid()}`;

    const planGroup: PlanGroup = {
      id,
      tenantId:    input.tenantId,
      name:        input.name,
      description: input.description ?? null,
      createdAt:   now,
      updatedAt:   now,
    };

    await this.uow.run(async (tx) => {
      await this.planGroupRepo.create(planGroup, tx);
    });

    return { planGroupId: id, name: input.name, createdAt: now };
  }
}

export interface CreatePlanInput {
  tenantId: string;
  planGroupId: string;
  name: string;
  amountMinor: Kobo;
  billingInterval: BillingInterval;
  billingIntervalCount?: number;
  trialPeriodDays?: number;
  lookupKey: string;
}

export interface CreatePlanResult {
  planId: string;
  name: string;
  amountMinor: Kobo;
  createdAt: Date;
}

export class CreatePlanService {
  constructor(
    private readonly planGroupRepo: PlanGroupRepo,
    private readonly planRepo: PlanRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreatePlanInput): Promise<CreatePlanResult> {
    assertNonNegative(input.amountMinor, 'plan.amountMinor');

    const pg = await this.planGroupRepo.findById(input.tenantId, input.planGroupId);
    if (!pg) throw new NotFoundError('PlanGroup', input.planGroupId);

    const now = this.clock.now();
    const id = `pln_${ulid()}`;

    const plan: Plan = {
      id,
      tenantId:             input.tenantId,
      planGroupId:          input.planGroupId,
      name:                 input.name,
      amountMinor:          input.amountMinor,
      currency:             'NGN',
      billingInterval:      input.billingInterval,
      billingIntervalCount: input.billingIntervalCount ?? 1,
      trialPeriodDays:      input.trialPeriodDays ?? 0,
      lookupKey:            input.lookupKey,
      active:               true,
      createdAt:            now,
      updatedAt:            now,
    };

    await this.uow.run(async (tx) => {
      await this.planRepo.create(plan, tx);
    });

    return { planId: id, name: input.name, amountMinor: input.amountMinor, createdAt: now };
  }
}

export interface UpdatePlanInput {
  tenantId: string;
  planId: string;
  name?: string | undefined;
  amountMinor?: Kobo | undefined;
  billingInterval?: BillingInterval | undefined;
  billingIntervalCount?: number | undefined;
  trialPeriodDays?: number | undefined;
  lookupKey?: string | null | undefined;
  active?: boolean | undefined;
}

export class UpdatePlanService {
  constructor(
    private readonly planRepo: PlanRepo,
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdatePlanInput): Promise<Plan> {
    const existing = await this.planRepo.findById(input.tenantId, input.planId);
    if (!existing) throw new NotFoundError('Plan', input.planId);
    if (input.amountMinor !== undefined) assertNonNegative(input.amountMinor, 'plan.amountMinor');

    // Price/interval are immutable once a plan has subscribers — changing them would
    // silently re-price everyone at their next renewal. Create a new plan and migrate instead.
    const changesAmount = input.amountMinor !== undefined && input.amountMinor !== existing.amountMinor;
    const changesInterval =
      (input.billingInterval !== undefined && input.billingInterval !== existing.billingInterval) ||
      (input.billingIntervalCount !== undefined && input.billingIntervalCount !== existing.billingIntervalCount);
    if (changesAmount || changesInterval) {
      const subs = await this.subscriptionRepo.countByPlan(input.tenantId, input.planId);
      if (subs > 0) throw new PlanImmutableError(changesAmount ? 'amount' : 'billing interval');
    }

    const updated: Plan = {
      ...existing,
      name:                 input.name ?? existing.name,
      amountMinor:          input.amountMinor ?? existing.amountMinor,
      billingInterval:      input.billingInterval ?? existing.billingInterval,
      billingIntervalCount: input.billingIntervalCount ?? existing.billingIntervalCount,
      trialPeriodDays:      input.trialPeriodDays ?? existing.trialPeriodDays,
      lookupKey:            input.lookupKey !== undefined ? input.lookupKey : existing.lookupKey,
      active:               input.active ?? existing.active,
      updatedAt:            this.clock.now(),
    };

    await this.uow.run(async (tx) => {
      await this.planRepo.update(updated, tx);
    });

    return updated;
  }
}

export interface DeletePlanResult {
  planId: string;
  /** true = archived (subscribers exist); false = hard-deleted (was unused) */
  archived: boolean;
}

// "Delete" is archive-by-default: a plan that has subscriptions is archived (active=false)
// so existing subscribers keep billing and history stays intact; only a never-subscribed
// plan is hard-deleted.
export class DeletePlanService {
  constructor(
    private readonly planRepo: PlanRepo,
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: { tenantId: string; planId: string }): Promise<DeletePlanResult> {
    const existing = await this.planRepo.findById(input.tenantId, input.planId);
    if (!existing) throw new NotFoundError('Plan', input.planId);

    const subs = await this.subscriptionRepo.countByPlan(input.tenantId, input.planId);

    if (subs > 0) {
      await this.uow.run(async (tx) => {
        await this.planRepo.update({ ...existing, active: false, updatedAt: this.clock.now() }, tx);
      });
      return { planId: input.planId, archived: true };
    }

    await this.uow.run(async (tx) => {
      await this.planRepo.delete(input.tenantId, input.planId, tx);
    });
    return { planId: input.planId, archived: false };
  }
}
