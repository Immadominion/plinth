import type { TenantPolicyRepo, TenantPolicy } from '../../src/db/policy.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

const DEFAULTS: Omit<TenantPolicy, 'tenantId' | 'updatedAt'> = {
  upgradeStrategy:     'immediate_prorated',
  downgradeStrategy:   'at_period_end',
  changeDuringDunning: 'gate_upgrades',
  cancelPolicy:        'end_of_period',
  graceDays:           7,
  maxDebtMinor:        10_000_000n,
};

export class InMemoryPolicyRepo implements TenantPolicyRepo {
  private store = new Map<string, TenantPolicy>();

  seed(policy: TenantPolicy): void { this.store.set(policy.tenantId, policy); }

  async findByTenantId(tenantId: string): Promise<TenantPolicy> {
    return this.store.get(tenantId) ?? { tenantId, ...DEFAULTS, updatedAt: new Date(0) };
  }

  async upsert(policy: TenantPolicy, _tx?: TxContext): Promise<void> {
    this.store.set(policy.tenantId, policy);
  }
}
