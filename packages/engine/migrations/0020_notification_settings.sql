-- Per-tenant notification preferences. No row = all defaults (both channels on, every event on,
-- brand = the tenant's name). The dashboard Notifications tab reads/writes this.
CREATE TABLE IF NOT EXISTS "notification_settings" (
  "tenant_id"       text PRIMARY KEY NOT NULL,
  "sms_enabled"     boolean NOT NULL DEFAULT true,
  "email_enabled"   boolean NOT NULL DEFAULT true,
  "brand_override"  text,
  "disabled_events" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);
