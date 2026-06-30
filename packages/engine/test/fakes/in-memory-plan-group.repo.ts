import type { PlanGroupRepo, PlanGroup } from '../../src/db/catalog.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemoryPlanGroupRepo implements PlanGroupRepo {
  private store = new Map<string, PlanGroup>();

  seed(pg: PlanGroup): void {
    this.store.set(pg.id, pg);
  }

  async findById(_tenantId: string, id: string, _tx?: TxContext): Promise<PlanGroup | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(tenantId: string, _tx?: TxContext): Promise<PlanGroup[]> {
    return [...this.store.values()].filter((pg) => pg.tenantId === tenantId);
  }

  async create(planGroup: PlanGroup, _tx?: TxContext): Promise<void> {
    this.store.set(planGroup.id, planGroup);
  }
}
