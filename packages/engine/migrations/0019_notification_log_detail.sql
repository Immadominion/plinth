-- Enrich the notification dedup log so it doubles as a delivery log the dashboard can render:
-- what event, the message sent, and per-channel (SMS / email) recipient + outcome.
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "event_type"   text;
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "message"      text;
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "sms_to"       text;
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "sms_status"   text;
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "email_to"     text;
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "email_status" text;
