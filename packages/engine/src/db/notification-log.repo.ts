import { ulid } from 'ulid';
import { and, desc, eq } from 'drizzle-orm';
import { db } from './client.js';
import { notificationLog } from './schema.js';

export type ChannelStatus = 'sent' | 'failed' | null;

export interface NotificationLogEntry {
  id:          string;
  tenantId:    string;
  customerId:  string;
  eventType:   string | null;
  message:     string | null;
  smsTo:       string | null;
  smsStatus:   string | null;
  emailTo:     string | null;
  emailStatus: string | null;
  createdAt:   Date;
}

export interface ClaimParams {
  tenantId:   string;
  customerId: string;
  dedupeKey:  string;
  eventType:  string;
  message:    string;
  smsTo:      string | null;
  emailTo:    string | null;
  now:        Date;
}

export interface NotificationLogRepo {
  // Atomically claim a (tenant, dedupeKey) slot AND stamp the notification detail. Returns the new
  // row id when this call inserted it (first time — caller should send), or null if it already
  // existed (a duplicate — caller skips). Channel statuses start null; finalize() records outcomes.
  claim(p: ClaimParams): Promise<string | null>;
  finalize(id: string, statuses: { smsStatus: ChannelStatus; emailStatus: ChannelStatus }): Promise<void>;
  list(tenantId: string, opts?: { customerId?: string; limit?: number }): Promise<NotificationLogEntry[]>;
}

type Row = typeof notificationLog.$inferSelect;

function toDomain(r: Row): NotificationLogEntry {
  return {
    id:          r.id,
    tenantId:    r.tenantId,
    customerId:  r.customerId,
    eventType:   r.eventType,
    message:     r.message,
    smsTo:       r.smsTo,
    smsStatus:   r.smsStatus,
    emailTo:     r.emailTo,
    emailStatus: r.emailStatus,
    createdAt:   r.createdAt,
  };
}

export class DrizzleNotificationLogRepo implements NotificationLogRepo {
  async claim(p: ClaimParams): Promise<string | null> {
    const id = `ntl_${ulid()}`;
    const inserted = await db
      .insert(notificationLog)
      .values({
        id,
        tenantId:   p.tenantId,
        customerId: p.customerId,
        dedupeKey:  p.dedupeKey,
        eventType:  p.eventType,
        message:    p.message,
        smsTo:      p.smsTo,
        emailTo:    p.emailTo,
        createdAt:  p.now,
      })
      .onConflictDoNothing({ target: [notificationLog.tenantId, notificationLog.dedupeKey] })
      .returning({ id: notificationLog.id });
    return inserted.length > 0 ? id : null;
  }

  async finalize(id: string, statuses: { smsStatus: ChannelStatus; emailStatus: ChannelStatus }): Promise<void> {
    await db
      .update(notificationLog)
      .set({ smsStatus: statuses.smsStatus, emailStatus: statuses.emailStatus })
      .where(eq(notificationLog.id, id));
  }

  async list(tenantId: string, opts?: { customerId?: string; limit?: number }): Promise<NotificationLogEntry[]> {
    const where = opts?.customerId
      ? and(eq(notificationLog.tenantId, tenantId), eq(notificationLog.customerId, opts.customerId))
      : eq(notificationLog.tenantId, tenantId);
    const rows = await db
      .select()
      .from(notificationLog)
      .where(where)
      .orderBy(desc(notificationLog.createdAt))
      .limit(opts?.limit ?? 200);
    return rows.map(toDomain);
  }
}
