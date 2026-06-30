import type { PlanRepo, Plan, Entitlement } from '../../src/db/catalog.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemoryPlanRepo implements PlanRepo {
  private store = new Map<string, Plan>();
  private entitlementStore = new Map<string, Entitlement[]>(); // planId → entitlements

  seedEntitlements(planId: string, entitlementsList: Entitlement[]): void {
    this.entitlementStore.set(planId, entitlementsList);
  }

  seed(plan: Plan): void {
    this.store.set(plan.id, plan);
  }

  async findById(_tenantId: string, id: string, _tx?: TxContext): Promise<Plan | null> {
    return this.store.get(id) ?? null;
  }

  async findByPlanGroup(tenantId: string, planGroupId: string, _tx?: TxContext): Promise<Plan[]> {
    return [...this.store.values()].filter(
      (p) => p.tenantId === tenantId && p.planGroupId === planGroupId,
    );
  }

  async findEntitlementsByPlan(_tenantId: string, planId: string): Promise<Entitlement[]> {
    return this.entitlementStore.get(planId) ?? [];
  }

  async create(plan: Plan, _tx?: TxContext): Promise<void> {
    this.store.set(plan.id, plan);
  }

  async update(plan: Plan, _tx: TxContext): Promise<void> {
    this.store.set(plan.id, plan);
  }
}
