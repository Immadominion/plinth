"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { CheckIcon } from "./icons";

/* ──────────────────────────────────────────────────────────────
   Reconciliation, shown not told. Inbound transfers land on the
   left and resolve into the four real outcomes — exact, partial,
   overpayment, unidentified — on a jade/grayscale palette (no
   competing colours, per brand.md).

   On scroll-in it plays a short beat: rows rise, the coverage bar
   fills, then the status chip "resolves" — the feel of money being
   reconciled. Respects prefers-reduced-motion (renders settled, no
   tilt).
   ────────────────────────────────────────────────────────────── */

type Kind = "exact" | "partial" | "over" | "unknown";

type Row = {
  amount: string;
  meta: string;
  chip: string;
  kind: Kind;
  fill: number; // invoice coverage, 0..1
};

const ROWS: Row[] = [
  { amount: "₦5,000", meta: "acct •••4821 → INV-1042", chip: "Matched", kind: "exact", fill: 1 },
  { amount: "₦3,200", meta: "acct •••7715 → INV-1043", chip: "₦1,800 due", kind: "partial", fill: 0.64 },
  { amount: "₦12,000", meta: "acct •••2093 → INV-1044", chip: "+₦2,000 credit", kind: "over", fill: 1 },
  { amount: "₦900", meta: "sender unmatched", chip: "Needs review", kind: "unknown", fill: 0 },
];

const chipClass: Record<Kind, string> = {
  exact: "bg-gradient-to-b from-jade to-jade-600 text-white",
  over: "bg-jade/12 text-jade-600 ring-1 ring-jade/25",
  partial: "bg-ink/[0.05] text-ink/60",
  unknown: "border border-dashed border-ink/25 text-ink/60",
};

// per-row elevation, kept within brand.md's ≤8%-opacity shadow rule — a
// touch of jade-tinted lift for the money-positive rows, flat for the
// unresolved one, so elevation itself is a quiet status signal
const rowShadow: Record<Kind, string> = {
  exact: "shadow-[0_10px_20px_-16px_rgba(15,163,127,0.08)]",
  over: "shadow-[0_10px_20px_-16px_rgba(15,163,127,0.08)]",
  partial: "shadow-[0_8px_16px_-14px_rgba(20,24,28,0.08)]",
  unknown: "",
};

function ChipIcon({ kind }: { kind: Kind }) {
  if (kind === "exact") return <CheckIcon className="h-3 w-3" />;
  if (kind === "over")
    return (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 19V5m0 0-6 6m6-6 6 6" />
      </svg>
    );
  if (kind === "partial")
    return (
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-current"
        style={{ background: "linear-gradient(90deg, currentColor 50%, transparent 50%)" }}
      />
    );
  return <span className="font-semibold leading-none">?</span>;
}

export function ReconcileVisual({ className = "" }: { className?: string }) {
  // reduced-motion users start "played" (settled) so there's no flash / motion
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [played, setPlayed] = useState(() => reducedMotion);
  const motion = !reducedMotion;
  const ref = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    if (played) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setPlayed(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [played]);

  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!motion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ rx: -(py - 0.5) * 3, ry: (px - 0.5) * 3 });
  };
  const onMouseLeave = () => setTilt({ rx: 0, ry: 0 });

  return (
    <div className={`relative ${className}`}>
      {/* a second card peeking out behind, faint jade tint — the depth cue,
          kept subtle (brand.md caps shadows/tints at ~8% opacity) */}
      <div aria-hidden className="absolute inset-2 -z-10 rotate-1 rounded-3xl bg-jade/[0.06]" />

      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="rounded-3xl border border-ink/10 bg-bone p-5 shadow-[0_20px_40px_-32px_rgba(20,24,28,0.16)] sm:p-6"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: "transform 400ms cubic-bezier(0.22,0.72,0.2,1)",
        }}
      >
      {/* header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-mid">
          Auto-reconciliation
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-jade-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-jade" />
          </span>
          Live
        </span>
      </div>

      {/* rows */}
      <div className="mt-4 space-y-2.5">
        {ROWS.map((r, i) => (
          <div
            key={r.amount + r.meta}
            className={`rounded-xl border border-ink/10 bg-white px-4 py-3 ${rowShadow[r.kind]}`}
            style={{
              opacity: played ? 1 : 0,
              transform: played ? "none" : "translateY(12px)",
              transition: motion
                ? `opacity 500ms cubic-bezier(0.22,0.72,0.2,1) ${i * 120}ms, transform 500ms cubic-bezier(0.22,0.72,0.2,1) ${i * 120}ms`
                : "none",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-ink">{r.amount}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${chipClass[r.kind]}`}
                style={{
                  opacity: played ? 1 : 0,
                  transform: played ? "none" : "translateY(4px)",
                  transition: motion
                    ? `opacity 380ms ease ${i * 120 + 380}ms, transform 380ms ease ${i * 120 + 380}ms`
                    : "none",
                }}
              >
                <ChipIcon kind={r.kind} />
                {r.chip}
              </span>
            </div>
            <div className="mt-1.5 font-mono text-[11px] text-ink/60">{r.meta}</div>
            {/* invoice coverage bar */}
            <div
              className={`mt-2.5 h-1.5 w-full overflow-hidden rounded-full ${
                r.kind === "unknown" ? "border border-dashed border-ink/15 bg-transparent" : "bg-ink/[0.06]"
              }`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-jade-400 to-jade"
                style={{
                  width: played ? `${r.fill * 100}%` : "0%",
                  transition: motion ? `width 700ms cubic-bezier(0.22,0.72,0.2,1) ${i * 120 + 240}ms` : "none",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* footer — every kobo accounted for */}
      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4">
        <span className="font-mono text-[11px] text-ink/60">4 transfers · ₦21,100 in</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-jade-600">
          <CheckIcon className="h-3.5 w-3.5" />
          Every kobo accounted for
        </span>
      </div>
      </div>
    </div>
  );
}
