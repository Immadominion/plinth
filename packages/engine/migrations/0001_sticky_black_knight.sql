CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"external_ref" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"account_balance_minor" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"invoice_id" text,
	"type" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"balance_after_minor" bigint NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_external_ref_idx" ON "customers" USING btree ("tenant_id","external_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_tenant_customer_idx" ON "ledger_entries" USING btree ("tenant_id","customer_id","created_at");