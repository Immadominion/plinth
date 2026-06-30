CREATE TABLE "card_tokens" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL,
  "customer_id" text NOT NULL,
  "token_key" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX "card_tokens_customer_id_idx" ON "card_tokens" ("customer_id");
CREATE INDEX "card_tokens_tenant_id_idx" ON "card_tokens" ("tenant_id");
