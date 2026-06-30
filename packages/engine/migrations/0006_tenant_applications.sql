CREATE TABLE "tenant_applications" (
  "id"                   text PRIMARY KEY,
  "business_name"        text NOT NULL,
  "email"                text NOT NULL,
  "rc_number"            text,
  "website"              text,
  "contact_name"         text NOT NULL,
  "description"          text,
  "status"               text NOT NULL DEFAULT 'pending',
  "nomba_sub_account_id" text,
  "tenant_id"            text,
  "rejection_reason"     text,
  "reviewed_at"          timestamp with time zone,
  "created_at"           timestamp with time zone NOT NULL
);

CREATE INDEX "tenant_applications_status_idx" ON "tenant_applications" ("status");
CREATE INDEX "tenant_applications_email_idx" ON "tenant_applications" ("email");
