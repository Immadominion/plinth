-- Dedup log for customer-facing notifications (SMS + email). One row per (tenant, dedupe_key);
-- the unique index makes a re-send a no-op, so repeated billing ticks never double-notify a customer.
CREATE TABLE IF NOT EXISTS "notification_log" (
  "id"          text PRIMARY KEY NOT NULL,
  "tenant_id"   text NOT NULL,
  "customer_id" text NOT NULL,
  "dedupe_key"  text NOT NULL,
  "created_at"  timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_log_tenant_dedupe_idx" ON "notification_log" ("tenant_id","dedupe_key");
CREATE INDEX IF NOT EXISTS "notification_log_customer_idx" ON "notification_log" ("tenant_id","customer_id");
