CREATE TABLE IF NOT EXISTS "subscription_scheduled_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"new_plan_id" text NOT NULL,
	"new_quantity" integer DEFAULT 1 NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_policies" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"upgrade_strategy" text DEFAULT 'immediate_prorated' NOT NULL,
	"downgrade_strategy" text DEFAULT 'at_period_end' NOT NULL,
	"change_during_dunning" text DEFAULT 'gate_upgrades' NOT NULL,
	"cancel_policy" text DEFAULT 'end_of_period' NOT NULL,
	"grace_days" integer DEFAULT 7 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sub_scheduled_changes_sub_idx" ON "subscription_scheduled_changes" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sub_scheduled_changes_tenant_idx" ON "subscription_scheduled_changes" USING btree ("tenant_id");