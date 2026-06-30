export type BillingInterval = 'day' | 'week' | 'month' | 'year';

export function addInterval(date: Date, interval: BillingInterval, count: number): Date {
  const d = new Date(date);
  switch (interval) {
    case 'day':   d.setUTCDate(d.getUTCDate() + count); break;
    case 'week':  d.setUTCDate(d.getUTCDate() + count * 7); break;
    case 'month': d.setUTCMonth(d.getUTCMonth() + count); break;
    case 'year':  d.setUTCFullYear(d.getUTCFullYear() + count); break;
  }
  return d;
}

export function addDays(date: Date, days: number): Date {
  return addInterval(date, 'day', days);
}
