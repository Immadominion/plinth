CREATE TABLE IF NOT EXISTS "plan_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_group_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"billing_interval" text NOT NULL,
	"billing_interval_count" integer DEFAULT 1 NOT NULL,
	"trial_period_days" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entitlements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"feature" text NOT NULL,
	"value" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"state" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"default_payment_method_id" text,
	"preferred_rail" text DEFAULT 'card' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"next_bill_at" timestamp with time zone NOT NULL,
	"trial_end_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"state" text NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"amount_due_minor" bigint NOT NULL,
	"amount_paid_minor" bigint DEFAULT 0 NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"billing_mode" text DEFAULT 'advance' NOT NULL,
	"is_receivable" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"description" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "plan_groups_tenant_id_name_idx" ON "plan_groups" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plans_tenant_id_idx" ON "plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plans_plan_group_id_idx" ON "plans" USING btree ("plan_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entitlements_plan_id_idx" ON "entitlements" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entitlements_tenant_id_feature_idx" ON "entitlements" USING btree ("tenant_id","feature");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_tenant_state_idx" ON "subscriptions" USING btree ("tenant_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_next_bill_at_idx" ON "subscriptions" USING btree ("next_bill_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_customer_id_idx" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_trial_end_at_idx" ON "subscriptions" USING btree ("trial_end_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_tenant_state_idx" ON "invoices" USING btree ("tenant_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_subscription_id_idx" ON "invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_due_at_idx" ON "invoices" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");