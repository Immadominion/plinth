import { describe, it, expect } from 'vitest';
import { nextRetryAt, MAX_DUNNING_ATTEMPTS } from './dunning-schedule.js';

describe('nextRetryAt', () => {
  const base = new Date('2026-01-10T00:00:00Z'); // 10th Jan — payday (25th) is 15 days away

  it('attempt 0 → +1 day', () => {
    const result = nextRetryAt(0, base);
    const expected = new Date('2026-01-11T00:00:00Z');
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attempt 1 → +3 days', () => {
    const result = nextRetryAt(1, base);
    const expected = new Date('2026-01-13T00:00:00Z');
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attempt 2 → +7 days', () => {
    const result = nextRetryAt(2, base);
    const expected = new Date('2026-01-17T00:00:00Z');
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('attempt 3 → +14 days', () => {
    const result = nextRetryAt(3, base);
    const expected = new Date('2026-01-24T00:00:00Z');
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('beyond MAX_DUNNING_ATTEMPTS clamps to 14 days', () => {
    const result = nextRetryAt(99, base);
    const expected = new Date(base.getTime() + 14 * 86_400_000);
    expect(result.toISOString()).toBe(expected.toISOString());
  });

  it('payday falls between now and scheduled retry → returns payday', () => {
    // now = Jan 20, attempt 3 = +14 days = Feb 3; payday (25th Jan) is between them
    const now = new Date('2026-01-20T00:00:00Z');
    const result = nextRetryAt(3, now);
    const payday = new Date('2026-01-25T00:00:00Z');
    expect(result.toISOString()).toBe(payday.toISOString());
  });

  it('payday already past → uses next month payday when it falls in window', () => {
    // now = Jan 26, attempt 3 = +14 days = Feb 9; next payday = Feb 25 (outside window) → scheduled
    const now = new Date('2026-01-26T00:00:00Z');
    const result = nextRetryAt(3, now);
    const scheduled = new Date(now.getTime() + 14 * 86_400_000);
    expect(result.toISOString()).toBe(scheduled.toISOString());
  });

  it('MAX_DUNNING_ATTEMPTS is 4', () => {
    expect(MAX_DUNNING_ATTEMPTS).toBe(4);
  });
});
