import { eq, and } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { planGroups, plans, entitlements } from './schema.js';
import type { Kobo } from '../domain/money.js';
import type { BillingInterval } from '../domain/period.js';

export interface PlanGroup {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanGroupRepo {
  findById(tenantId: string, id: string, tx?: TxContext): Promise<PlanGroup | null>;
  findAll(tenantId: string, tx?: TxContext): Promise<PlanGroup[]>;
  create(planGroup: PlanGroup, tx?: TxContext): Promise<void>;
}

export interface Plan {
  id: string;
  tenantId: string;
  planGroupId: string;
  name: string;
  amountMinor: Kobo;
  currency: 'NGN';
  billingInterval: BillingInterval;
  billingIntervalCount: number;
  trialPeriodDays: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entitlement {
  feature: string;
  value: string;
}

export interface PlanRepo {
  findAll(tenantId: string): Promise<Plan[]>;
  findById(tenantId: string, id: string, tx?: TxContext): Promise<Plan | null>;
  findByPlanGroup(tenantId: string, planGroupId: string, tx?: TxContext): Promise<Plan[]>;
  findEntitlementsByPlan(tenantId: string, planId: string): Promise<Entitlement[]>;
  create(plan: Plan, tx?: TxContext): Promise<void>;
  update(plan: Plan, tx: TxContext): Promise<void>;
}

type PlanGroupRow = typeof planGroups.$inferSelect;
type PlanRow = typeof plans.$inferSelect;

function toPlanGroupDomain(row: PlanGroupRow): PlanGroup {
  return {
    id:          row.id,
    tenantId:    row.tenantId,
    name:        row.name,
    description: row.description ?? null,
    createdAt:   row.createdAt,
    updatedAt:   row.updatedAt,
  };
}

function toPlanDomain(row: PlanRow): Plan {
  return {
    id:                   row.id,
    tenantId:             row.tenantId,
    planGroupId:          row.planGroupId,
    name:                 row.name,
    amountMinor:          row.amountMinor,
    currency:             'NGN',
    billingInterval:      row.billingInterval,
    billingIntervalCount: row.billingIntervalCount,
    trialPeriodDays:      row.trialPeriodDays,
    active:               row.active,
    createdAt:            row.createdAt,
    updatedAt:            row.updatedAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzlePlanGroupRepo implements PlanGroupRepo {
  async findById(tenantId: string, id: string, tx?: TxContext): Promise<PlanGroup | null> {
    const client = getClient(tx);
    const rows = await client.select().from(planGroups).where(eq(planGroups.id, id));
    const row = rows.find((r) => r.tenantId === tenantId);
    return row ? toPlanGroupDomain(row) : null;
  }

  async findAll(tenantId: string, tx?: TxContext): Promise<PlanGroup[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(planGroups)
      .where(eq(planGroups.tenantId, tenantId));
    return rows.map(toPlanGroupDomain);
  }

  async create(planGroup: PlanGroup, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(planGroups).values({
      id:          planGroup.id,
      tenantId:    planGroup.tenantId,
      name:        planGroup.name,
      description: planGroup.description,
      createdAt:   planGroup.createdAt,
      updatedAt:   planGroup.updatedAt,
    });
  }
}

export class DrizzlePlanRepo implements PlanRepo {
  async findAll(tenantId: string): Promise<Plan[]> {
    const rows = await db.select().from(plans).where(eq(plans.tenantId, tenantId));
    return rows.map(toPlanDomain);
  }

  async findById(tenantId: string, id: string, tx?: TxContext): Promise<Plan | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(plans)
      .where(and(eq(plans.tenantId, tenantId), eq(plans.id, id)));
    return rows[0] ? toPlanDomain(rows[0]) : null;
  }

  async findByPlanGroup(tenantId: string, planGroupId: string, tx?: TxContext): Promise<Plan[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(plans)
      .where(and(eq(plans.tenantId, tenantId), eq(plans.planGroupId, planGroupId)));
    return rows.map(toPlanDomain);
  }

  async create(plan: Plan, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(plans).values({
      id:                   plan.id,
      tenantId:             plan.tenantId,
      planGroupId:          plan.planGroupId,
      name:                 plan.name,
      amountMinor:          plan.amountMinor,
      currency:             plan.currency,
      billingInterval:      plan.billingInterval,
      billingIntervalCount: plan.billingIntervalCount,
      trialPeriodDays:      plan.trialPeriodDays,
      active:               plan.active,
      createdAt:            plan.createdAt,
      updatedAt:            plan.updatedAt,
    });
  }

  async findEntitlementsByPlan(tenantId: string, planId: string): Promise<Entitlement[]> {
    const rows = await db
      .select()
      .from(entitlements)
      .where(and(eq(entitlements.tenantId, tenantId), eq(entitlements.planId, planId)));
    return rows.map((r) => ({ feature: r.feature, value: r.value }));
  }

  async update(plan: Plan, tx: TxContext): Promise<void> {
    const client = fromTxContext(tx);
    await client
      .update(plans)
      .set({
        name:                 plan.name,
        amountMinor:          plan.amountMinor,
        billingInterval:      plan.billingInterval,
        billingIntervalCount: plan.billingIntervalCount,
        trialPeriodDays:      plan.trialPeriodDays,
        active:               plan.active,
        updatedAt:            plan.updatedAt,
      })
      .where(and(eq(plans.tenantId, plan.tenantId), eq(plans.id, plan.id)));
  }
}
