import type { OutboxEvent } from '../db/event.repo.js';

// Stable, versioned event contract delivered to integrator endpoints. Mirrors the shape most
// billing platforms use, so consumers can rely on `{ id, type, created, data.object }`.
export const WEBHOOK_API_VERSION = '2026-01-01';

export interface WebhookEnvelope {
  id: string;
  object: 'event';
  api_version: string;
  type: string;
  created: number;                 // unix seconds
  data: { object: Record<string, unknown> };
}

export function buildEnvelope(event: OutboxEvent): WebhookEnvelope {
  return {
    id:          event.id,
    object:      'event',
    api_version: WEBHOOK_API_VERSION,
    type:        event.type,
    created:     Math.floor(event.occurredAt.getTime() / 1000),
    data:        { object: event.payload },
  };
}
