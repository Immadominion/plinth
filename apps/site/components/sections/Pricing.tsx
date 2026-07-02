import { Container, Section, SectionHeading, PrimaryButton, SecondaryButton } from "./ui";

/* Pricing structure templated; actual amounts are finalised at launch
   (usage-based infra pricing — no fabricated numbers shipped). */
const tiers = [
  {
    name: "Sandbox",
    price: "Free",
    note: "Build and test end-to-end",
    features: ["Full API & SDK access", "Test mode", "Webhooks", "Community support"],
    cta: "Start building",
    highlight: false,
  },
  {
    name: "Growth",
    price: "Usage-based",
    note: "Go live and scale",
    features: [
      "Everything in Sandbox",
      "Live transfers & cards",
      "Smart, payday-aware dunning",
      "Reconciliation & ledger",
      "Email support",
    ],
    cta: "Start building",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "Volume, controls & SLAs",
    features: ["Everything in Growth", "Volume pricing", "Dedicated support & SLA", "Custom policy & onboarding"],
    cta: "Talk to sales",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <Section id="pricing" className="bg-white">
      <Container>
        <SectionHeading
          center
          eyebrow="Pricing"
          title="Start free. Pay as you grow."
          sub="Transparent, usage-based pricing — final rates published at launch."
          className="mx-auto"
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-2xl border p-7 ${
                t.highlight ? "border-jade bg-bone shadow-md ring-1 ring-jade/30" : "border-ink/10 bg-bone"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-ink">{t.name}</h3>
                {t.highlight ? (
                  <span className="rounded-full bg-jade px-2.5 py-1 text-[11px] font-semibold text-white">
                    Most popular
                  </span>
                ) : null}
              </div>
              <div className="mt-4 font-display text-3xl font-semibold tracking-tightest text-ink">{t.price}</div>
              <p className="mt-1 text-sm text-ink/60">{t.note}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink/75">
                    <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-jade" fill="none">
                      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {t.highlight ? (
                  <PrimaryButton href="#" className="w-full">
                    {t.cta}
                  </PrimaryButton>
                ) : (
                  <SecondaryButton href="#" className="w-full">
                    {t.cta}
                  </SecondaryButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
