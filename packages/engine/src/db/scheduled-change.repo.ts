import { eq, and } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { subscriptionScheduledChanges } from './schema.js';

// 'period_end' → apply at renewal (scheduledFor is set). 'payment' → apply when a checkout payment settles.
export type ChangeApplyOn = 'period_end' | 'payment';

export interface ScheduledChange {
  id: string;
  tenantId: string;
  subscriptionId: string;
  newPlanId: string;
  newQuantity: number;
  applyOn: ChangeApplyOn;
  scheduledFor: Date | null;
  dueMinor: bigint | null;
  createdAt: Date;
}

export interface ScheduledChangeRepo {
  // Period-end (date-triggered) change only — the renewal path must never see a still-unpaid payment change.
  findBySubscription(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<ScheduledChange | null>;
  // Payment-triggered change awaiting settlement (apply_on='payment').
  findPendingPaymentBySub(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<ScheduledChange | null>;
  create(change: ScheduledChange, tx?: TxContext): Promise<void>;
  delete(tenantId: string, id: string, tx?: TxContext): Promise<void>;
  deleteBySubscription(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<void>;
}

type Row = typeof subscriptionScheduledChanges.$inferSelect;

function toDomain(row: Row): ScheduledChange {
  return {
    id:             row.id,
    tenantId:       row.tenantId,
    subscriptionId: row.subscriptionId,
    newPlanId:      row.newPlanId,
    newQuantity:    row.newQuantity,
    applyOn:        (row.applyOn ?? 'period_end') as ChangeApplyOn,
    scheduledFor:   row.scheduledFor,
    dueMinor:       row.dueMinor,
    createdAt:      row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleScheduledChangeRepo implements ScheduledChangeRepo {
  async findBySubscription(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<ScheduledChange | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(subscriptionScheduledChanges)
      .where(and(
        eq(subscriptionScheduledChanges.tenantId, tenantId),
        eq(subscriptionScheduledChanges.subscriptionId, subscriptionId),
        eq(subscriptionScheduledChanges.applyOn, 'period_end'),
      ))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findPendingPaymentBySub(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<ScheduledChange | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(subscriptionScheduledChanges)
      .where(and(
        eq(subscriptionScheduledChanges.tenantId, tenantId),
        eq(subscriptionScheduledChanges.subscriptionId, subscriptionId),
        eq(subscriptionScheduledChanges.applyOn, 'payment'),
      ))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(change: ScheduledChange, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client
      .insert(subscriptionScheduledChanges)
      .values({
        id:             change.id,
        tenantId:       change.tenantId,
        subscriptionId: change.subscriptionId,
        newPlanId:      change.newPlanId,
        newQuantity:    change.newQuantity,
        applyOn:        change.applyOn,
        scheduledFor:   change.scheduledFor,
        dueMinor:       change.dueMinor,
        createdAt:      change.createdAt,
      })
      .onConflictDoUpdate({
        target: subscriptionScheduledChanges.subscriptionId,
        set: {
          id:           change.id,
          newPlanId:    change.newPlanId,
          newQuantity:  change.newQuantity,
          applyOn:      change.applyOn,
          scheduledFor: change.scheduledFor,
          dueMinor:     change.dueMinor,
          createdAt:    change.createdAt,
        },
      });
  }

  async delete(tenantId: string, id: string, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client
      .delete(subscriptionScheduledChanges)
      .where(and(eq(subscriptionScheduledChanges.tenantId, tenantId), eq(subscriptionScheduledChanges.id, id)));
  }

  async deleteBySubscription(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client
      .delete(subscriptionScheduledChanges)
      .where(and(eq(subscriptionScheduledChanges.tenantId, tenantId), eq(subscriptionScheduledChanges.subscriptionId, subscriptionId)));
  }
}
