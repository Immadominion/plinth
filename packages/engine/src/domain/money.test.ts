import { describe, it, expect } from 'vitest';
import { divideHalfUp, prorate, assertNonNegative, formatNaira, ZERO } from './money.js';

describe('money — divideHalfUp (half-up integer division)', () => {
  it('rounds exactly-half up', () => {
    expect(divideHalfUp(5n, 2n)).toBe(3n);   // 2.5 → 3
    expect(divideHalfUp(3n, 2n)).toBe(2n);   // 1.5 → 2
  });

  it('rounds below-half down, above-half up', () => {
    expect(divideHalfUp(1n, 3n)).toBe(0n);   // 0.33 → 0
    expect(divideHalfUp(2n, 3n)).toBe(1n);   // 0.66 → 1
  });

  it('is exact when evenly divisible', () => {
    expect(divideHalfUp(24000000n, 30n)).toBe(800000n);
  });

  it('matches the proration worked example (₦5,000 × 20/30)', () => {
    expect(divideHalfUp(10000000n, 30n)).toBe(333333n); // 333333.33 → 333333
  });

  it('rounds on magnitude for negatives', () => {
    expect(divideHalfUp(-5n, 2n)).toBe(-3n); // −2.5 → −3
  });

  it('throws on division by zero', () => {
    expect(() => divideHalfUp(1n, 0n)).toThrow(/division by zero/);
  });
});

describe('money — prorate', () => {
  it('prorates ₦5,000 over 20 of 30 days', () => {
    expect(prorate(500000n, 20n, 30n)).toBe(333333n);
  });

  it('prorates ₦12,000 over 20 of 30 days', () => {
    expect(prorate(1200000n, 20n, 30n)).toBe(800000n);
  });
});

describe('money — assertNonNegative', () => {
  it('passes on zero and positive', () => {
    expect(() => assertNonNegative(ZERO, 'x')).not.toThrow();
    expect(() => assertNonNegative(500000n, 'x')).not.toThrow();
  });

  it('throws on negative (never emit a negative invoice)', () => {
    expect(() => assertNonNegative(-1n, 'invoice total')).toThrow(/must be non-negative/);
  });
});

describe('money — formatNaira (display only)', () => {
  it('formats kobo as ₦ with 2 decimals', () => {
    expect(formatNaira(500000n)).toContain('5,000.00');
    expect(formatNaira(466667n)).toContain('4,666.67');
    expect(formatNaira(ZERO)).toContain('0.00');
  });
});
