-- Pay-to-change: let a scheduled change represent "apply when this checkout payment settles"
-- (apply_on = 'payment') in addition to the existing "apply on a date" (apply_on = 'period_end').
-- scheduled_for becomes nullable because a payment-triggered change has no fixed date.
-- due_minor stores the proration amount the customer was quoted at checkout, so the paid
-- invoice recorded on settlement matches exactly what they paid (not a re-computed value).
ALTER TABLE "subscription_scheduled_changes" ALTER COLUMN "scheduled_for" DROP NOT NULL;
ALTER TABLE "subscription_scheduled_changes" ADD COLUMN "apply_on" text NOT NULL DEFAULT 'period_end';
ALTER TABLE "subscription_scheduled_changes" ADD COLUMN "due_minor" bigint;
