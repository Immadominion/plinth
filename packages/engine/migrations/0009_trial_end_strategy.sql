ALTER TABLE "tenant_policies" ADD COLUMN "trial_end_strategy" text NOT NULL DEFAULT 'activate_then_charge';
