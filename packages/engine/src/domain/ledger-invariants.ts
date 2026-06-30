import { ZERO, type Kobo } from './money.js';
import { ReconciliationError } from './errors.js';
import type { LedgerEntry } from './ledger-types.js';

export function sumEntries(entries: readonly LedgerEntry[]): Kobo {
  return entries.reduce<Kobo>((acc, e) => acc + e.amountMinor, ZERO);
}

export function splitDebitsCredits(entries: readonly LedgerEntry[]): {
  credits: Kobo;
  debits: Kobo;
} {
  let credits = ZERO;
  let debits = ZERO;
  for (const e of entries) {
    if (e.amountMinor >= ZERO) credits += e.amountMinor;
    else debits += -e.amountMinor;
  }
  return { credits, debits };
}

export function assertBalanceContinuity(
  entries: readonly LedgerEntry[],
  opening: Kobo = ZERO,
): void {
  let running = opening;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    running += e.amountMinor;
    if (e.balanceAfterMinor !== running) {
      throw new ReconciliationError(
        'ledger_continuity_broken',
        `ledger_continuity_broken: LedgerEntry ${e.id} (index ${i}) has ` +
          `balance_after_minor=${e.balanceAfterMinor}, expected ${running} ` +
          `(running sum from opening ${opening}).`,
      );
    }
  }
}

export function assertConserved(
  entries: readonly LedgerEntry[],
  cachedBalance: Kobo,
  opening: Kobo = ZERO,
): void {
  const expected = opening + sumEntries(entries);
  if (cachedBalance !== expected) {
    throw new ReconciliationError(
      'ledger_balance_mismatch',
      `ledger_balance_mismatch: cached balance ${cachedBalance} != opening ${opening} + ` +
        `Σ entries ${sumEntries(entries)} = ${expected}. Money appeared from nowhere or was lost.`,
    );
  }
}

export function assertLedgerInvariant(
  entries: readonly LedgerEntry[],
  cachedBalance: Kobo,
  opening: Kobo = ZERO,
): void {
  assertBalanceContinuity(entries, opening);
  assertConserved(entries, cachedBalance, opening);
}
