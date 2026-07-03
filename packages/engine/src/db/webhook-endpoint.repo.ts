import { eq, and } from 'drizzle-orm';
import { db } from './client.js';
import { webhookEndpoints } from './schema.js';

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  description: string | null;
  enabled: boolean;
  eventTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

type Row = typeof webhookEndpoints.$inferSelect;

function toDomain(row: Row): WebhookEndpoint {
  return {
    id:          row.id,
    tenantId:    row.tenantId,
    url:         row.url,
    secret:      row.secret,
    description: row.description ?? null,
    enabled:     row.enabled,
    eventTypes:  (row.eventTypes as string[]) ?? [],
    createdAt:   row.createdAt,
    updatedAt:   row.updatedAt,
  };
}

export class DrizzleWebhookEndpointRepo {
  async create(e: WebhookEndpoint): Promise<void> {
    await db.insert(webhookEndpoints).values(e);
  }

  async listByTenant(tenantId: string): Promise<WebhookEndpoint[]> {
    const rows = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.tenantId, tenantId));
    return rows.map(toDomain);
  }

  // Enabled endpoints only — the dispatcher's fan-out source.
  async listEnabledByTenant(tenantId: string): Promise<WebhookEndpoint[]> {
    const rows = await db.select().from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.tenantId, tenantId), eq(webhookEndpoints.enabled, true)));
    return rows.map(toDomain);
  }

  async findById(tenantId: string, id: string): Promise<WebhookEndpoint | null> {
    const rows = await db.select().from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.tenantId, tenantId), eq(webhookEndpoints.id, id))).limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async update(tenantId: string, id: string, patch: Partial<Pick<WebhookEndpoint, 'url' | 'description' | 'enabled' | 'eventTypes' | 'secret'>>, updatedAt: Date): Promise<void> {
    await db.update(webhookEndpoints).set({ ...patch, updatedAt })
      .where(and(eq(webhookEndpoints.tenantId, tenantId), eq(webhookEndpoints.id, id)));
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await db.delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.tenantId, tenantId), eq(webhookEndpoints.id, id)));
  }
}
