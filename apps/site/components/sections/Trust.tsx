import { Container, Section, SectionHeading } from "./ui";

const pillars = [
  {
    title: "Double-entry ledger",
    body: "Every movement is recorded twice and balances exactly. Kobo-precise money math you can audit.",
  },
  {
    title: "Idempotent by design",
    body: "Retries and webhooks can't double-charge or double-count. Safe to call again.",
  },
  {
    title: "Every kobo reconciled",
    body: "Exact, partial, overpayment, unidentified — each inbound transfer is accounted for.",
  },
  {
    title: "Built on Nomba's rails",
    body: "Settlement and movement run on regulated, production payment infrastructure.",
  },
];

export default function Trust() {
  return (
    <Section id="trust" className="bg-bone">
      <Container>
        <SectionHeading
          center
          eyebrow="Correctness & trust"
          title="Money-critical, by default."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-ink/10 bg-white p-6">
              <h3 className="font-display text-base font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink/40">
          Security &amp; compliance details (encryption, access controls, certifications) — placeholder, to be finalised before launch.
        </p>
      </Container>
    </Section>
  );
}
