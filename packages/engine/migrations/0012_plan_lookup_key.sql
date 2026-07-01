ALTER TABLE "plans" ADD COLUMN "lookup_key" text;
CREATE UNIQUE INDEX "plans_tenant_lookup_key_idx" ON "plans" ("tenant_id", "lookup_key");
