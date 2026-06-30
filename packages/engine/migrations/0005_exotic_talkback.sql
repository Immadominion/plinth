CREATE TABLE IF NOT EXISTS "dunning_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"decline_code" text NOT NULL,
	"decline_type" text NOT NULL,
	"next_retry_at" timestamp with time zone,
	"attempted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_mode" text DEFAULT 'advance' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_policies" ADD COLUMN "max_debt_minor" bigint DEFAULT 10000000 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dunning_attempts_sub_idx" ON "dunning_attempts" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dunning_attempts_tenant_idx" ON "dunning_attempts" USING btree ("tenant_id");