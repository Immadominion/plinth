CREATE TABLE IF NOT EXISTS "inbound_transfer_events" (
	"id" text PRIMARY KEY NOT NULL,
	"nomba_request_id" text NOT NULL,
	"account_ref" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"session_id" text DEFAULT '' NOT NULL,
	"tenant_id" text,
	"customer_id" text,
	"invoice_id" text,
	"outcome" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suspense_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"amount_minor" bigint NOT NULL,
	"account_ref" text NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"nomba_request_id" text NOT NULL,
	"reason" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_note" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "virtual_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"account_ref" text NOT NULL,
	"nomba_account_holder_id" text NOT NULL,
	"account_number" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbound_transfer_events_nomba_request_id_idx" ON "inbound_transfer_events" USING btree ("nomba_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suspense_items_tenant_id_idx" ON "suspense_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suspense_items_resolved_at_idx" ON "suspense_items" USING btree ("resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "virtual_accounts_account_ref_idx" ON "virtual_accounts" USING btree ("account_ref");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "virtual_accounts_customer_id_idx" ON "virtual_accounts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "virtual_accounts_tenant_id_idx" ON "virtual_accounts" USING btree ("tenant_id");