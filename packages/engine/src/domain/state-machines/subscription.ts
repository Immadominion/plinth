import { StateTransitionError } from '../errors.js';

export type SubscriptionState =
  | 'trialing'
  | 'incomplete'
  | 'active'
  | 'past_due'
  | 'grace'
  | 'paused'
  | 'delinquent'
  | 'canceled';

const LEGAL: Record<SubscriptionState, SubscriptionState[]> = {
  trialing:   ['active', 'incomplete', 'canceled'],
  incomplete: ['active', 'trialing', 'canceled'],
  active:     ['past_due', 'paused', 'canceled'],
  past_due:   ['active', 'grace', 'canceled'],
  grace:      ['active', 'delinquent', 'canceled'],
  paused:     ['active', 'canceled'],
  delinquent: ['active', 'canceled'],
  canceled:   [],
};

export function canTransition(from: SubscriptionState, to: SubscriptionState): boolean {
  return LEGAL[from].includes(to);
}

export function assertTransition(from: SubscriptionState, to: SubscriptionState): void {
  if (!canTransition(from, to)) {
    throw new StateTransitionError(from, to);
  }
}
