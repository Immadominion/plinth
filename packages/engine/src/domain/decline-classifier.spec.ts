import { describe, it, expect } from 'vitest';
import { classifyDecline } from './decline-classifier.js';

describe('classifyDecline', () => {
  it('classifies STOLEN_CARD as hard', () => {
    expect(classifyDecline('STOLEN_CARD')).toBe('hard');
  });

  it('classifies LOST_CARD as hard', () => {
    expect(classifyDecline('LOST_CARD')).toBe('hard');
  });

  it('classifies CARD_EXPIRED as hard', () => {
    expect(classifyDecline('CARD_EXPIRED')).toBe('hard');
  });

  it('classifies DO_NOT_HONOR as hard', () => {
    expect(classifyDecline('DO_NOT_HONOR')).toBe('hard');
  });

  it('classifies FRAUDULENT as hard', () => {
    expect(classifyDecline('FRAUDULENT')).toBe('hard');
  });

  it('classifies hard codes case-insensitively', () => {
    expect(classifyDecline('stolen_card')).toBe('hard');
  });

  it('classifies INSUFFICIENT_FUNDS as soft', () => {
    expect(classifyDecline('INSUFFICIENT_FUNDS')).toBe('soft');
  });

  it('classifies unknown codes as soft (conservative default)', () => {
    expect(classifyDecline('SOME_RANDOM_CODE')).toBe('soft');
  });

  it('classifies empty string as soft', () => {
    expect(classifyDecline('')).toBe('soft');
  });
});
