import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { PlanGroupRepo, PlanGroup } from '../db/catalog.repo.js';
import type { PlanRepo, Plan } from '../db/catalog.repo.js';
import type { Kobo } from '../domain/money.js';
import type { BillingInterval } from '../domain/period.js';
import { NotFoundError } from '../domain/errors.js';
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
  active?: boolean | undefined;
}

export class UpdatePlanService {
  constructor(
    private readonly planRepo: PlanRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdatePlanInput): Promise<Plan> {
    const existing = await this.planRepo.findById(input.tenantId, input.planId);
    if (!existing) throw new NotFoundError('Plan', input.planId);
    if (input.amountMinor !== undefined) assertNonNegative(input.amountMinor, 'plan.amountMinor');

    const updated: Plan = {
      ...existing,
      name:                 input.name ?? existing.name,
      amountMinor:          input.amountMinor ?? existing.amountMinor,
      billingInterval:      input.billingInterval ?? existing.billingInterval,
      billingIntervalCount: input.billingIntervalCount ?? existing.billingIntervalCount,
      trialPeriodDays:      input.trialPeriodDays ?? existing.trialPeriodDays,
      active:               input.active ?? existing.active,
      updatedAt:            this.clock.now(),
    };

    await this.uow.run(async (tx) => {
      await this.planRepo.update(updated, tx);
    });

    return updated;
  }
}
