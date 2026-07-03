-- Outbound webhook delivery layer. Endpoints are per-tenant destinations; deliveries are the
-- fan-out log (one row per event × endpoint) that drives retries and powers the dashboard.
CREATE TABLE "webhook_endpoints" (
  "id"          text PRIMARY KEY,
  "tenant_id"   text NOT NULL,
  "url"         text NOT NULL,
  "secret"      text NOT NULL,                          -- whsec_… used to sign deliveries
  "description" text,
  "enabled"     boolean NOT NULL DEFAULT true,
  "event_types" json NOT NULL DEFAULT '[]'::json,       -- [] = all event types
  "created_at"  timestamptz NOT NULL,
  "updated_at"  timestamptz NOT NULL
);
CREATE INDEX "webhook_endpoints_tenant_idx" ON "webhook_endpoints" ("tenant_id");

CREATE TABLE "webhook_deliveries" (
  "id"             text PRIMARY KEY,
  "tenant_id"      text NOT NULL,
  "endpoint_id"    text NOT NULL,
  "event_id"       text NOT NULL,
  "event_type"     text NOT NULL,
  "status"         text NOT NULL DEFAULT 'pending',     -- pending | retrying | succeeded | failed
  "attempts"       integer NOT NULL DEFAULT 0,
  "response_code"  integer,
  "error"          text,
  "next_retry_at"  timestamptz,
  "last_attempt_at" timestamptz,
  "created_at"     timestamptz NOT NULL,
  "updated_at"     timestamptz NOT NULL
);
-- One delivery per (endpoint, event): makes fan-out idempotent under retries/races.
CREATE UNIQUE INDEX "webhook_deliveries_endpoint_event_idx" ON "webhook_deliveries" ("endpoint_id", "event_id");
CREATE INDEX "webhook_deliveries_due_idx" ON "webhook_deliveries" ("status", "next_retry_at");
CREATE INDEX "webhook_deliveries_endpoint_idx" ON "webhook_deliveries" ("endpoint_id", "created_at");
