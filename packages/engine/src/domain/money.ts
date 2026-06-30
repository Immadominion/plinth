// All money is integer kobo (bigint). ₦1 = 100 kobo. Never floats, ever.
// [S1][S2][S3] — engineering-standards Area 1

export type Kobo = bigint;

export const ZERO: Kobo = 0n;

/** Half-up integer division: round_half_up(numerator / denominator). */
export function divideHalfUp(numerator: Kobo, denominator: Kobo): Kobo {
  if (denominator === 0n) throw new Error('[money] division by zero');
  const sign = (numerator < 0n) !== (denominator < 0n) ? -1n : 1n;
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;
  const quotient = absNum / absDen;
  const remainder = absNum % absDen;
  return sign * (remainder * 2n >= absDen ? quotient + 1n : quotient);
}

/** Prorate: amount × numerator / denominator, rounded half-up. */
export function prorate(amount: Kobo, numerator: bigint, denominator: bigint): Kobo {
  return divideHalfUp(amount * numerator, denominator);
}

/** Assert amount is non-negative — never emit a negative invoice. */
export function assertNonNegative(amount: Kobo, label: string): void {
  if (amount < 0n) {
    throw new Error(`[money] ${label} must be non-negative; got ${amount} kobo`);
  }
}

/** Format kobo as ₦ string for display only — never use for computation. */
export function formatNaira(kobo: Kobo): string {
  const naira = Number(kobo) / 100;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
