const RETRY_DELAYS_DAYS = [1, 3, 7, 14];
export const MAX_DUNNING_ATTEMPTS = 4;

// Payday-aware: if there's a payday (default 25th) between now and the
// scheduled retry, advance the retry to catch the customer on payday.
export function nextRetryAt(attemptNumber: number, now: Date, paydayDay = 25): Date {
  const daysDelay = RETRY_DELAYS_DAYS[attemptNumber] ?? 14;
  const scheduled = new Date(now.getTime() + daysDelay * 86_400_000);

  // Find nearest upcoming payday
  const paydayThisMonth = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), paydayDay,
  ));
  const payday = paydayThisMonth > now
    ? paydayThisMonth
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, paydayDay));

  // If payday falls between now and scheduled → retry on payday
  if (payday > now && payday < scheduled) return payday;
  return scheduled;
}
