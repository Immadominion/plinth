# Dashboard Upgrades — Plan

_Grounded in a full audit of `apps/web` (June 2026). Covers both audiences: the serving-company
(tenant) dashboard and the Plinth platform-admin dashboard._

## Context

The backend **notification system** is built and proven end-to-end:
SMS (Twilio) + email, tenant-branded, deduped via the `notification_log` table, best-effort
(never breaks a billing tick). Events covered: `paymentDue`, `pastDue`, `delinquent`, `recovered`,
`activated`, `paymentReceipt`, `trialEnded`, `canceled`.

**However, it has zero dashboard surface.** That, plus some mock-data debt, is what these upgrades address.

---

## Current state (audit summary)

The tenant dashboard is genuinely feature-rich and **live**: overview, customers, customer detail,
subscriptions, invoices, catalog, transfers/reconciliation, settings (general / API keys / billing
policy / test mode), and webhooks.

Three pages still render **mock data**:

| Page | Status |
|---|---|
| `/dashboard/dunning` | `MOCK_DUNNING` — flagship Kanban board is not wired to live subs |
| `/dashboard/events` | `MOCK_EVENTS` — real event outbox exists in the backend |
| `/admin` (platform overview) | `MOCK_ADMIN_TENANTS` — system health / tenant MRR / queue lag all fake |

`/admin/tenants` (application review + approval) is the one **live** platform-admin page.

---

## Gap 1 — The notification system has no UI

A tenant can't see or control any notifications today. Priority order:

### ① Notification log — `/dashboard/notifications` _(new)_
- Reads the new `notification_log` table → answers "did this customer actually get the dunning SMS + email?"
- The payoff of the backend work; also a real support tool.
- **Work:** one list endpoint (`GET /v1/notifications`, filter by customer/date/event/channel) + a page.
- **Effort:** M

### ② Notification settings — new tab in `/dashboard/settings`
- Today the brand is fixed to the tenant name and **all** events always send.
- Let tenants: override brand/sender, toggle SMS vs email, opt out of specific events, and **send a test** SMS/email.
- **Effort:** M

### ③ Customer detail enrichment — `/dashboard/customers/[id]`
- Notification history for that customer, a "reachable?" badge (has phone / has email),
  and a **"Send payment-due notice now"** action on the subscriptions tab.
- Ops teams live in the customer page; today it shows phone/email but no delivery state or manual send.
- **Effort:** S–M

---

## Gap 2 — Mock-data debt (demo credibility)

- **`/dashboard/dunning`** — wire the Kanban to real `past_due` / `grace` / `delinquent` subs
  **and** add a **"notify customer"** button (ties dunning + notifications together).
- **`/dashboard/events`** — read the live event outbox instead of `MOCK_EVENTS`.

---

## Plinth platform-admin side

- **`/admin` overview** — wire system health, tenant MRR, queue lag to real metrics (currently mocked).
- _Nice-to-have (lower priority):_ a cross-tenant notification/delivery-health panel (SMS/email success
  rates). The platform admin does not manage individual customer messages, so this is secondary.

---

## Recommended sequence

Start **tenant-side, notifications first** — it completes the feature just shipped and is the most
demo-visible:

1. **Notification log** (backend list endpoint + `/dashboard/notifications` page)
2. **Settings tab** (channel/event config + test-send)
3. **Wire the dunning board live** + add the "notify" action
4. _Then:_ customer-detail notification history; wire `/admin` overview live

This turns the backend notification work into something a serving company can see, control, and trust —
and kills the biggest mock-data liability (dunning) along the way.

---

## Route reference

| Route | Audience | Live? | Key APIs |
|---|---|---|---|
| `/dashboard` | Tenant | ✅ | subscriptions, plans, invoices |
| `/dashboard/customers` | Tenant | ✅ | customers.list/create |
| `/dashboard/customers/[id]` | Tenant | ✅ | customers.get/entitlements, subscriptions, virtualAccount |
| `/dashboard/subscriptions` | Tenant | ✅ | subscriptions, clock, tick, simulatePayment |
| `/dashboard/invoices` | Tenant | ✅ | invoices, customers |
| `/dashboard/catalog` | Tenant | ✅ | planGroups, plans, policy |
| `/dashboard/transfers` | Tenant | ✅ | invoices, suspense, customers |
| `/dashboard/dunning` | Tenant | ⚠️ mock | — |
| `/dashboard/settings` | Tenant | ✅ | me, keys, policy, clock, tick |
| `/dashboard/events` | Tenant | ⚠️ mock | — |
| `/dashboard/webhooks` | Tenant | ✅ | webhookEndpoints.* |
| `/dashboard/notifications` | Tenant | ❌ missing | _(to build)_ |
| `/admin` | Platform | ⚠️ mock | — |
| `/admin/tenants` | Platform | ✅ | adminApplications.list/approve/reject |
