import { eq, inArray } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { events } from './schema.js';

export interface OutboxEvent {
  id: string;
  tenantId: string;
  type: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

export interface EventRepo {
  append(event: OutboxEvent, tx: TxContext): Promise<void>;
  findById(id: string): Promise<OutboxEvent | null>;
  findPendingDelivery(limit: number, tx?: TxContext): Promise<OutboxEvent[]>;
  markDelivered(eventIds: string[], tx?: TxContext): Promise<void>;
}

type Row = typeof events.$inferSelect;

function toDomain(row: Row): OutboxEvent {
  return {
    id:           row.id,
    tenantId:     row.tenantId,
    type:         row.type,
    resourceType: row.resourceType,
    resourceId:   row.resourceId,
    payload:      row.payload as Record<string, unknown>,
    occurredAt:   row.occurredAt,
    createdAt:    row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleEventRepo implements EventRepo {
  async append(event: OutboxEvent, tx: TxContext): Promise<void> {
    const client = fromTxContext(tx);
    await client.insert(events).values({
      id:           event.id,
      tenantId:     event.tenantId,
      type:         event.type,
      resourceType: event.resourceType,
      resourceId:   event.resourceId,
      payload:      event.payload,
      delivered:    false,
      occurredAt:   event.occurredAt,
      createdAt:    event.createdAt,
    });
  }

  async findById(id: string): Promise<OutboxEvent | null> {
    const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findPendingDelivery(limit: number, tx?: TxContext): Promise<OutboxEvent[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(events)
      .where(eq(events.delivered, false))
      .limit(limit);
    return rows.map(toDomain);
  }

  async markDelivered(eventIds: string[], tx?: TxContext): Promise<void> {
    if (eventIds.length === 0) return;
    const client = getClient(tx);
    await client
      .update(events)
      .set({ delivered: true })
      .where(inArray(events.id, eventIds));
  }
}
