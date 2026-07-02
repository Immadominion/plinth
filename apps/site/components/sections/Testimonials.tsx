import { Container, Section, SectionHeading } from "./ui";

/* Pre-launch: real quotes/names are not fabricated. These are clearly-marked
   placeholder slots to be filled with consented customer quotes before launch. */
export default function Testimonials() {
  return (
    <Section id="testimonials" className="bg-bone">
      <Container>
        <SectionHeading center eyebrow="Social proof" title="What builders say." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6"
            >
              <blockquote className="flex-1 text-sm leading-relaxed text-ink/45">
                “Placeholder quote — a customer describes how Plinth recovered revenue and removed
                the manual reconciliation work.”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-ink/10" aria-hidden />
                <div className="text-xs text-ink/40">
                  <div className="font-semibold text-ink/55">Name, Role</div>
                  <div>Company (placeholder)</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}
