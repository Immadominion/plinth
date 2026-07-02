import { Container, Section, SectionHeading } from "./ui";

const faqs = [
  {
    q: "What exactly is Plinth?",
    a: "Recurring-payments infrastructure for Nigeria. It handles subscriptions, recurring billing, and automatic reconciliation so you don't have to build billing from scratch.",
  },
  {
    q: "Do I need a Nomba account?",
    a: "Plinth runs on Nomba's payment rails. You integrate with Plinth; the underlying settlement is powered by Nomba.",
  },
  {
    q: "Cards or bank transfer?",
    a: "Both, fully. Plinth is transfer-native because transfers clear reliably in Nigeria, with first-class card support and an automatic card → transfer fallback.",
  },
  {
    q: "How does reconciliation work?",
    a: "Each customer gets a dedicated account number, so inbound transfers arrive already attributed. Plinth matches exact, partial, overpayment, and unidentified payments automatically.",
  },
  {
    q: "How long does integration take?",
    a: "A few lines with the SDK to create a plan, subscribe a customer, and read entitlements. Clean API, webhooks, and idempotency are built in.",
  },
  {
    q: "What does it cost?",
    a: "Start free in sandbox. Live usage is usage-based, with custom pricing for volume. Final rates are published at launch.",
  },
];

export default function FAQ() {
  return (
    <Section id="faq" className="bg-white">
      <Container>
        <SectionHeading center eyebrow="FAQ" title="Questions, answered." />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-ink/10 border-y border-ink/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold text-ink">
                {f.q}
                <span
                  aria-hidden
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/50 transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
