import type { SubscriptionRepo, Subscription, SubscriptionState } from '../db/subscription.repo.js';
import type { PlanRepo } from '../db/catalog.repo.js';

export interface AccessStatus {
  subscriptionId: string | null;
  state: SubscriptionState | null;
  hasAccess: boolean;
  tier: 'full' | 'free' | 'none';
  features: Record<string, string>;
}

function deriveAccess(state: SubscriptionState): { hasAccess: boolean; tier: 'full' | 'free' | 'none' } {
  switch (state) {
    case 'active':
    case 'trialing':
    case 'grace':
    case 'past_due':
      return { hasAccess: true, tier: 'full' };
    case 'paused':
      return { hasAccess: false, tier: 'free' };
    case 'incomplete':
      // Strict trial-end: trial converted but first charge not yet cleared → no access.
      return { hasAccess: false, tier: 'none' };
    case 'delinquent':
    case 'canceled':
      return { hasAccess: false, tier: 'free' };
    default:
      return { hasAccess: false, tier: 'none' };
  }
}

// Priority order for picking the "best" subscription when a customer has multiple
const STATE_PRIORITY: SubscriptionState[] = ['active', 'trialing', 'grace', 'past_due', 'incomplete', 'paused', 'delinquent', 'canceled'];

function pickBestSub(subs: Subscription[]): Subscription | null {
  if (subs.length === 0) return null;
  return subs.sort((a, b) => {
    const ai = STATE_PRIORITY.indexOf(a.state);
    const bi = STATE_PRIORITY.indexOf(b.state);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  })[0] ?? null;
}

export class EntitlementsService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepo,
    private readonly planRepo: PlanRepo,
  ) {}

  async getForCustomer(tenantId: string, customerId: string): Promise<AccessStatus> {
    // Gather subscriptions across meaningful states
    const states: SubscriptionState[] = ['active', 'trialing', 'grace', 'past_due', 'incomplete', 'paused', 'delinquent'];
    const allSubs: Subscription[] = [];
    for (const state of states) {
      const subs = await this.subscriptionRepo.findByState(tenantId, state);
      allSubs.push(...subs.filter((s) => s.customerId === customerId));
    }

    const best = pickBestSub(allSubs);
    if (!best) {
      return { subscriptionId: null, state: null, hasAccess: false, tier: 'free', features: {} };
    }

    const { hasAccess, tier } = deriveAccess(best.state);
    const entitlementRows = await this.planRepo.findEntitlementsByPlan(tenantId, best.planId);
    const features: Record<string, string> = {};
    for (const e of entitlementRows) features[e.feature] = e.value;

    return { subscriptionId: best.id, state: best.state, hasAccess, tier, features };
  }

  async getSubscriptionStatus(tenantId: string, subscriptionId: string): Promise<AccessStatus> {
    const sub = await this.subscriptionRepo.findById(tenantId, subscriptionId);
    if (!sub) {
      return { subscriptionId, state: null, hasAccess: false, tier: 'none', features: {} };
    }

    const { hasAccess, tier } = deriveAccess(sub.state);
    const entitlementRows = await this.planRepo.findEntitlementsByPlan(tenantId, sub.planId);
    const features: Record<string, string> = {};
    for (const e of entitlementRows) features[e.feature] = e.value;

    return { subscriptionId: sub.id, state: sub.state, hasAccess, tier, features };
  }
}
