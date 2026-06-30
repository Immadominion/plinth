# Plinth — Landing Page Brief
*For the frontend engineer. Everything you need to design and build the marketing landing page. Copy here is example/starter copy — use it, sharpen it, or swap it; it's meant to give you the flow, not lock you in.*

---

## 1. What Plinth is (in one line, then a paragraph)

**Plinth is recurring-payments infrastructure for Nigeria — the base businesses build their billing and collections on.**

Plinth handles subscriptions, recurring billing, and automatic payment reconciliation, built for how Nigerians actually pay: bank transfer first, cards fully supported. It's powered by Nomba's payment rails. Other businesses plug into Plinth instead of rebuilding billing from scratch — Plinth carries the hard, money-critical parts (collecting, retrying, reconciling, tracking who's paid) so their product can stand on top.

> **Powered by Nomba.** Include a "Powered by Nomba" lockup (footer and/or hero). The rails underneath are Nomba's; Plinth is the billing layer on top.

---

## 2. The name & the metaphor — this is the design spine

A **plinth** is the solid base block a column or statue stands on: load-bearing, foundational, the thing everything above depends on. The customer's product is the column; **Plinth is the base it stands on.**

Let this metaphor drive the whole look and story:
- **Visual motifs:** solid base blocks, stacked/layered forms, things resting on a foundation, isometric slabs, clean geometric structure.
- **Feeling:** premium, calm, dependable, architectural. Infrastructure you trust and don't think about — it just holds.
- **Narrative:** "the foundation," "build on it," "it bears the weight," "solid ground."
- Teach the word early (most people don't know "plinth") — the first screen should make the meaning obvious through copy + visual, and the name becomes an asset.

---

## 3. Who it's for

**Primary:** developers and product teams who bill customers on a recurring basis and don't want to build billing infrastructure themselves — SaaS, fintechs, schools, gyms, streaming services, landlords, cooperatives, content creators.

**Secondary:** any team that needs reliable per-customer payment collection and automatic reconciliation.

Tone should speak to builders: concrete, competent, benefit-led — not buzzwordy.

---

## 4. The offerings

### Main offering — **Plinth Subscriptions** (the billing engine)
The headline product. A managed recurring-billing layer.
- Recurring billing & subscriptions on Nigerian rails
- **Transfer-native with smart, payday-aware dunning** — recovers payments that fail (and most card charges in Nigeria do)
- **Cards fully supported too** — a complete, conventional card experience, first-class
- Proration, plan changes, upgrades/downgrades, prepaid & postpaid billing
- **Entitlements API** — tells the customer's product who currently has access
- Multi-tenant & configurable — ready-made presets or granular policy

### Side offering — **Plinth Accounts** (dedicated virtual accounts)
The foundation the engine runs on — also usable on its own.
- A dedicated account number for every customer
- **Automatic reconciliation** of inbound transfers — exact, partial, overpayment, or unidentified
- Per-customer statements and a running ledger
- Handles the messy cases (short payments, mystery payments) automatically
- Use it standalone, or as the base under Plinth Subscriptions

> Present these two as "main" and "and the foundation it's built on" — not two equal products. Subscriptions is the hero; Accounts is the solid base beneath it (the metaphor does double duty here).

---

## 5. Why it matters — the hooks / differentiators

Use these as section headers or feature cards:
- **Built for how Nigeria pays.** Cards fail often here; bank transfer rarely does. Plinth is transfer-native, so revenue actually gets collected.
- **Recovers revenue others lose.** Payday-aware retries and an automatic card → transfer fallback rescue failed payments instead of churning them.
- **Reconciliation, handled.** No more matching transfers to customers by hand — Plinth does it, including the awkward partial and unidentified payments.
- **Every kobo accounted for.** A double-entry ledger and exact, kobo-precise money math. Correctness you can trust.
- **A few lines to integrate.** Clean API, SDK, and webhooks. Drop it in; don't rebuild it.
- **Configurable for any business.** SaaS, a cooperative, a school, a streaming service — pick a preset or tune the policy.

---

## 6. Tone & visual direction

- **Register:** premium, trustworthy, developer-grade. Calm and solid, not loud or playful. Think the restraint of Stripe / Mercury / Plaid, with a structural, architectural twist.
- **Layout:** minimal, generous whitespace, strong typography, confident hierarchy. Let it breathe.
- **Motifs:** geometric base blocks, layered/stacked planes, an object resting on a solid base, subtle isometric depth. Avoid generic fintech stock photography.
- **Color:** a deep neutral base (stone, graphite, near-black) with **one** confident accent. Keep it restrained — solidity reads through neutrals. (Final palette is your call.)
- **Type:** a clean, slightly architectural sans for headings; highly readable body. Consider a mono font for code blocks (there's a developer audience).
- **Mobile-first, fast, accessible.** Many Nigerian users are on mobile; performance and clarity matter more than animation.

---

## 7. Suggested page structure (with starter copy)

**1 — Hero**
- Headline (pick/adapt one):
  - "The base your billing stands on."
  - "Recurring payments, on solid ground."
  - "Build your billing on Plinth."
- Subhead: "Subscriptions, recurring billing, and automatic reconciliation — built for how Nigeria actually pays. Powered by Nomba."
- Primary CTA: **Start building** · Secondary: **Read the docs**
- Visual: a clean base/plinth form with a product (column/block) resting on it.

**2 — The problem (short band)**
- "Recurring payments in Nigeria are leaky and manual. Cards fail. Transfers get reconciled by hand. Revenue quietly slips away."

**3 — Main offering: Subscriptions**
- Header: "Billing that recovers what others lose."
- 3–4 feature points from §4 (transfer-native dunning, cards too, proration/plan changes, entitlements).

**4 — Side offering: Accounts**
- Header: "And the foundation it's built on."
- Points: dedicated account per customer, automatic reconciliation, statements, standalone-capable.

**5 — How it works (3 steps)**
- "Create a plan → subscribe a customer → Plinth collects, retries, reconciles, and tells you who has access." (A simple 3-step or layered diagram.)

**6 — Built for how Nigeria pays (the differentiator)**
- Lead with the transfer-native story. A simple stat-style line: cards fail often, transfers rarely do — so Plinth defaults to the rail that works, and falls back to it when cards die.

**7 — Who builds on Plinth (use-case cards)**
- Cards for: a SaaS tool, a cooperative (ajo/esusu), a school, a streaming service, a landlord. (See examples in §8.)

**8 — Developer experience**
- Header: "Integrate in a few lines."
- Show the code snippet (§8 below) + "Read the docs."

**9 — Trust / correctness band**
- "A double-entry ledger. Idempotent by design. Every kobo reconciled."

**10 — Final CTA**
- "Build on Plinth." · Start building / Read the docs.

**11 — Footer**
- Powered by Nomba lockup, nav links (placeholders), legal placeholders.

---

## 8. Quick examples to flow along

**Hero headline + subhead (ready to drop in):**
> # The base your billing stands on.
> Subscriptions, recurring billing, and automatic reconciliation — built for how Nigeria actually pays. Powered by Nomba.

**Use-case cards (content for §7):**
- **SaaS, on cards** — "A Lagos SaaS tool bills 400 customers monthly. Cards that fail get retried and recovered automatically." 
- **A cooperative (ajo/esusu)** — "A savings circle gives every member a dedicated account number. Contributions reconcile themselves; the ledger is transparent to everyone."
- **A school** — "Fees per student, each with their own account number. Underpayments are tracked, not lost."
- **A streaming service** — "Monthly plans with upgrades, downgrades, and proration handled to the kobo."

**Developer snippet (for §8 — the "few lines" view):**
```ts
import { Plinth } from "@plinth/sdk";
const plinth = new Plinth(process.env.PLINTH_API_KEY);

// 1. Define a plan (₦5,000/month — amounts are in kobo)
const plan = await plinth.plans.create({
  name: "Pro",
  amount: 500_000,
  interval: "monthly",
});

// 2. Subscribe a customer
const sub = await plinth.subscriptions.create({
  customer: "cus_bob",
  plan: plan.id,
});

// 3. Ask who has access — your product gates on this
const access = await plinth.entitlements.get("cus_bob");
// → { active: true, features: ["pro"], valid_until: "2026-07-25" }
```

**Tagline options (for hero, meta, or section accents):**
- "Recurring payments, on solid ground."
- "Build on a base that holds."
- "Your product is the column. Plinth is the base."
- "Billing infrastructure that bears the weight."

---

## 9. Practical notes & guardrails

- **Pre-launch:** use placeholders for logos, testimonials, and metrics. **Do not fabricate** real customer names, partner logos, or made-up statistics — leave clearly-marked placeholder slots instead.
- **Keep "Powered by Nomba"** visible (footer at minimum).
- **Money:** display human-readable amounts (₦5,000), even though the API uses kobo. Always Naira (NGN).
- **Lead with benefits, teach the metaphor early**, keep jargon out of the hero — save "double-entry ledger," "idempotent," etc. for the trust band where they reassure rather than confuse.
- **Performance & a11y first** — fast load, semantic HTML, keyboard-navigable, good contrast.

---

*This brief is starter material. The product is Plinth — recurring-payments infrastructure on Nomba — with Subscriptions as the main offering and dedicated Accounts as the foundation beneath it. Build the page so a developer "gets it" in the first screen and a business owner sees themselves in the use cases.*
