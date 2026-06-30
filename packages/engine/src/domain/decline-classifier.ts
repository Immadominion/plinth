const HARD_CODES = new Set([
  'DO_NOT_HONOR', 'STOLEN_CARD', 'LOST_CARD', 'FRAUDULENT',
  'INVALID_CARD', 'CARD_EXPIRED', 'INCORRECT_PIN', 'ACCOUNT_CLOSED',
  'RESTRICTED_CARD', 'CARD_BLOCKED',
]);

export function classifyDecline(code: string): 'soft' | 'hard' {
  return HARD_CODES.has(code.toUpperCase()) ? 'hard' : 'soft'; // unknown → soft (conservative)
}
