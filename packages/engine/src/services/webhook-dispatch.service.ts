import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { EventRepo, OutboxEvent } from '../db/event.repo.js';
import type { DrizzleWebhookEndpointRepo, WebhookEndpoint } from '../db/webhook-endpoint.repo.js';
import type { DrizzleWebhookDeliveryRepo, WebhookDelivery } from '../db/webhook-delivery.repo.js';
import { buildEnvelope } from '../webhook/envelope.js';
import { buildSignatureHeader } from '../webhook/sign-payload.js';

// Backoff between delivery attempts. After MAX_ATTEMPTS failures the delivery is marked 'failed'
// (still visible in the dashboard and manually resendable).
const RETRY_DELAYS_SECONDS = [5, 30, 120, 600, 1800, 3600, 21600];
const MAX_ATTEMPTS = 8;
const REQUEST_TIMEOUT_MS = 10_000;

function matches(endpoint: WebhookEndpoint, eventType: string): boolean {
  return endpoint.eventTypes.length === 0 || endpoint.eventTypes.includes(eventType);
}

export interface DispatchResult { fannedOut: number; attempted: number; succeeded: number; failed: number }

/**
 * Drives outbound webhook delivery off the transactional outbox:
 *  1. fanOut()  — turn undelivered events into per-endpoint delivery rows (idempotent), then mark
 *                 the event delivered so it's not fanned out again.
 *  2. attempt() — POST due deliveries (fresh + retries), record status, schedule the next retry.
 * Runs on a scheduler; also triggerable via the admin route for demos.
 */
export class WebhookDispatchService {
  constructor(
    private readonly eventRepo: EventRepo,
    private readonly endpointRepo: DrizzleWebhookEndpointRepo,
    private readonly deliveryRepo: DrizzleWebhookDeliveryRepo,
    private readonly clock: Clock,
  ) {}

  async tick(limit = 200): Promise<DispatchResult> {
    const fannedOut = await this.fanOut(limit);
    const res = await this.attemptDue(limit);
    return { fannedOut, ...res };
  }

  async fanOut(limit: number): Promise<number> {
    const events = await this.eventRepo.findPendingDelivery(limit);
    if (events.length === 0) return 0;

    // Cache enabled endpoints per tenant across this batch.
    const byTenant = new Map<string, WebhookEndpoint[]>();
    const getEndpoints = async (tenantId: string): Promise<WebhookEndpoint[]> => {
      let eps = byTenant.get(tenantId);
      if (!eps) { eps = await this.endpointRepo.listEnabledByTenant(tenantId); byTenant.set(tenantId, eps); }
      return eps;
    };

    const now = this.clock.now();
    let created = 0;
    for (const event of events) {
      const endpoints = await getEndpoints(event.tenantId);
      for (const ep of endpoints) {
        if (!matches(ep, event.type)) continue;
        await this.deliveryRepo.createIgnoreConflict({
          id: `whd_${ulid()}`, tenantId: event.tenantId, endpointId: ep.id,
          eventId: event.id, eventType: event.type, status: 'pending', attempts: 0,
          responseCode: null, error: null, nextRetryAt: null, lastAttemptAt: null,
          createdAt: now, updatedAt: now,
        });
        created++;
      }
    }
    // Mark all fanned-out events delivered (even those with no endpoints — nothing to send).
    await this.eventRepo.markDelivered(events.map((e) => e.id));
    return created;
  }

  async attemptDue(limit: number): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const now = this.clock.now();
    const due = await this.deliveryRepo.findDue(now, limit);
    let succeeded = 0, failed = 0;

    for (const d of due) {
      const endpoint = await this.endpointRepo.findById(d.tenantId, d.endpointId);
      if (!endpoint || !endpoint.enabled) {
        // Endpoint removed/disabled since fan-out — retire the delivery.
        await this.deliveryRepo.markResult(d.id, {
          status: 'failed', attempts: d.attempts, responseCode: null,
          error: 'endpoint disabled or deleted', nextRetryAt: null, lastAttemptAt: now, updatedAt: now,
        });
        failed++;
        continue;
      }
      const outcome = await this.deliverOne(d, endpoint, now);
      if (outcome === 'succeeded') succeeded++;
      else if (outcome === 'failed') failed++;
    }
    return { attempted: due.length, succeeded, failed };
  }

  private async deliverOne(d: WebhookDelivery, endpoint: WebhookEndpoint, now: Date): Promise<'succeeded' | 'retrying' | 'failed'> {
    const event: OutboxEvent = await this.rehydrateEvent(d);
    const envelope = buildEnvelope(event);
    const body = JSON.stringify(envelope);
    const signature = buildSignatureHeader(endpoint.secret, envelope.created, body);
    const attempts = d.attempts + 1;

    let responseCode: number | null = null;
    let error: string | null = null;
    let ok = false;
    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'Plinth-Signature':  signature,
          'Plinth-Event-Type': envelope.type,
          'Plinth-Delivery-Id': d.id,
          'User-Agent':        'Plinth-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      responseCode = res.status;
      ok = res.ok;
      if (!ok) error = `non-2xx response: ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    if (ok) {
      await this.deliveryRepo.markResult(d.id, {
        status: 'succeeded', attempts, responseCode, error: null,
        nextRetryAt: null, lastAttemptAt: now, updatedAt: now,
      });
      return 'succeeded';
    }

    const exhausted = attempts >= MAX_ATTEMPTS;
    const delay = RETRY_DELAYS_SECONDS[Math.min(attempts - 1, RETRY_DELAYS_SECONDS.length - 1)]!;
    await this.deliveryRepo.markResult(d.id, {
      status: exhausted ? 'failed' : 'retrying', attempts, responseCode, error,
      nextRetryAt: exhausted ? null : new Date(now.getTime() + delay * 1000),
      lastAttemptAt: now, updatedAt: now,
    });
    return exhausted ? 'failed' : 'retrying';
  }

  // The delivery row stores type; re-read the source event for its payload/timestamp.
  private async rehydrateEvent(d: WebhookDelivery): Promise<OutboxEvent> {
    const found = await this.eventRepo.findById(d.eventId);
    if (found) return found;
    // Fallback (event pruned): deliver a minimal envelope from what the delivery row carries.
    return { id: d.eventId, tenantId: d.tenantId, type: d.eventType, resourceType: '', resourceId: '', payload: {}, occurredAt: d.createdAt, createdAt: d.createdAt };
  }
}
