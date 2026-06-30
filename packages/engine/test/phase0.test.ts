/**
 * Phase 0 smoke test — demo checkpoint.
 *   boot → create tenant + key → advance clock → replay idempotent call
 *
 * Requires a real Postgres DB (Docker). Set DATABASE_URL in .env or environment.
 * Run: pnpm --filter engine test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/http/app.js';
import { buildContainer } from '../src/http/container.js';
import type { Container } from '../src/http/container.js';

let container: Container;
let app: ReturnType<typeof buildApp>;

beforeAll(() => {
  container = buildContainer();
  app = buildApp(container);
});

afterAll(async () => {
  await container.close();
});

// Helper: fire a request against the Hono app
async function req(
  method: string,
  path: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };

  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const res = await app.fetch(request);
  let json: unknown;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json };
}

describe('Phase 0 — demo checkpoint', () => {
  it('health check returns ok', async () => {
    const { status, body } = await req('GET', '/health');
    expect(status).toBe(200);
    expect((body as { status: string }).status).toBe('ok');
  });

  it('POST /v1/tenants creates a tenant and returns a raw API key', async () => {
    const { status, body } = await req('POST', '/v1/tenants', {
      body: { name: 'Bob Dev Studio', mode: 'test' },
      headers: { 'Idempotency-Key': 'phase0-create-bob' },
    });

    expect(status).toBe(201);
    const b = body as Record<string, unknown>;
    expect(b.object).toBe('tenant');
    expect(typeof b.id).toBe('string');
    expect((b.id as string).startsWith('ten_')).toBe(true);
    expect(typeof b.api_key).toBe('string');
    expect((b.api_key as string).startsWith('sk_test_')).toBe(true);
    expect(b.mode).toBe('test');
  });

  it('POST /admin/clock/advance moves simulated time forward', async () => {
    const advanceSecs = 30 * 24 * 60 * 60; // 30 days
    const { status, body } = await req('POST', '/admin/clock/advance', {
      body: { advanceSeconds: advanceSecs },
    });

    expect(status).toBe(200);
    const b = body as Record<string, unknown>;
    expect(b.object).toBe('clock_state');
    expect(b.mode).toBe('test');
    expect(typeof b.simulated_now).toBe('string');
    expect(b.advanced_by_seconds).toBe(advanceSecs);
  });

  it('GET /admin/clock reflects the advanced simulated_now', async () => {
    const { status, body } = await req('GET', '/admin/clock');
    expect(status).toBe(200);
    const b = body as Record<string, unknown>;
    expect(b.mode).toBe('test');
    expect(typeof b.simulated_now).toBe('string');
    // Should be roughly 30 days ahead of when the test ran
    const simulated = new Date(b.simulated_now as string);
    const now = new Date();
    const diffDays = (simulated.getTime() - now.getTime()) / 1000 / 60 / 60 / 24;
    expect(diffDays).toBeGreaterThan(25);
  });

  it('replay — same Idempotency-Key returns identical response without re-creating', async () => {
    // First call — should create and store
    const first = await req('POST', '/v1/tenants', {
      body: { name: 'Acme Corp', mode: 'test' },
      headers: { 'Idempotency-Key': 'phase0-idempotency-test' },
    });
    expect(first.status).toBe(201);

    // Second call — same key, same body → replay
    const second = await req('POST', '/v1/tenants', {
      body: { name: 'Acme Corp', mode: 'test' },
      headers: { 'Idempotency-Key': 'phase0-idempotency-test' },
    });
    expect(second.status).toBe(201);

    // Must be the exact same tenant ID and API key
    const b1 = first.body as Record<string, unknown>;
    const b2 = second.body as Record<string, unknown>;
    expect(b2.id).toBe(b1.id);
    expect(b2.api_key).toBe(b1.api_key);
  });

  it('replay with different body returns 409 IdempotencyConflict', async () => {
    // Establish the key
    await req('POST', '/v1/tenants', {
      body: { name: 'Adashe Coop', mode: 'test' },
      headers: { 'Idempotency-Key': 'phase0-conflict-test' },
    });

    // Same key, different body → conflict
    const { status, body } = await req('POST', '/v1/tenants', {
      body: { name: 'DIFFERENT NAME', mode: 'live' },
      headers: { 'Idempotency-Key': 'phase0-conflict-test' },
    });
    expect(status).toBe(409);
    const b = body as { error: { type: string; code: string } };
    expect(b.error.type).toBe('idempotency_error');
  });
});
