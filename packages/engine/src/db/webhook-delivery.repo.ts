import { eq, and, or, lte, isNull, desc, sql } from 'drizzle-orm';
import { db } from './client.js';
import { webhookDeliveries } from './schema.js';

export type DeliveryStatus = 'pending' | 'retrying' | 'succeeded' | 'failed';

export interface WebhookDelivery {
  id: string;
  tenantId: string;
  endpointId: string;
  eventId: string;
  eventType: string;
  status: DeliveryStatus;
  attempts: number;
  responseCode: number | null;
  error: string | null;
  nextRetryAt: Date | null;
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type Row = typeof webhookDeliveries.$inferSelect;

function toDomain(row: Row): WebhookDelivery {
  return {
    id:            row.id,
    tenantId:      row.tenantId,
    endpointId:    row.endpointId,
    eventId:       row.eventId,
    eventType:     row.eventType,
    status:        row.status,
    attempts:      row.attempts,
    responseCode:  row.responseCode ?? null,
    error:         row.error ?? null,
    nextRetryAt:   row.nextRetryAt ?? null,
    lastAttemptAt: row.lastAttemptAt ?? null,
    createdAt:     row.createdAt,
    updatedAt:     row.updatedAt,
  };
}

export class DrizzleWebhookDeliveryRepo {
  // Idempotent fan-out: unique(endpoint_id, event_id) means a re-run inserts nothing new.
  async createIgnoreConflict(d: WebhookDelivery): Promise<void> {
    await db.insert(webhookDeliveries).values(d).onConflictDoNothing({
      target: [webhookDeliveries.endpointId, webhookDeliveries.eventId],
    });
  }

  // Deliveries ready to attempt now: fresh (pending) or a retry whose backoff has elapsed.
  async findDue(now: Date, limit: number): Promise<WebhookDelivery[]> {
    const rows = await db.select().from(webhookDeliveries)
      .where(or(
        eq(webhookDeliveries.status, 'pending'),
        and(eq(webhookDeliveries.status, 'retrying'), or(isNull(webhookDeliveries.nextRetryAt), lte(webhookDeliveries.nextRetryAt, now))),
      ))
      .limit(limit);
    return rows.map(toDomain);
  }

  async findById(tenantId: string, id: string): Promise<WebhookDelivery | null> {
    const rows = await db.select().from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.tenantId, tenantId), eq(webhookDeliveries.id, id))).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async listByEndpoint(tenantId: string, endpointId: string, limit: number): Promise<WebhookDelivery[]> {
    const rows = await db.select().from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.tenantId, tenantId), eq(webhookDeliveries.endpointId, endpointId)))
      .orderBy(desc(webhookDeliveries.createdAt)).limit(limit);
    return rows.map(toDomain);
  }

  async markResult(id: string, patch: {
    status: DeliveryStatus; attempts: number; responseCode: number | null;
    error: string | null; nextRetryAt: Date | null; lastAttemptAt: Date; updatedAt: Date;
  }): Promise<void> {
    await db.update(webhookDeliveries).set(patch).where(eq(webhookDeliveries.id, id));
  }

  // Requeue a delivery for immediate re-attempt (manual "resend" from the dashboard).
  async requeue(id: string, now: Date): Promise<void> {
    await db.update(webhookDeliveries)
      .set({ status: 'pending', nextRetryAt: null, updatedAt: now })
      .where(eq(webhookDeliveries.id, id));
  }

  async countByStatusForEndpoint(tenantId: string, endpointId: string): Promise<Record<string, number>> {
    const rows = await db.select({ status: webhookDeliveries.status, n: sql<number>`count(*)::int` })
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.tenantId, tenantId), eq(webhookDeliveries.endpointId, endpointId)))
      .groupBy(webhookDeliveries.status);
    return Object.fromEntries(rows.map((r) => [r.status, r.n]));
  }
}
