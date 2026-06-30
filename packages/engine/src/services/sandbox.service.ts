import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { TenantRepo } from '../db/tenant.repo.js';
import { CreateTenantService } from './tenant.service.js';
import { CreateCustomerService } from './customer.service.js';
import { CreatePlanGroupService, CreatePlanService } from './catalog.service.js';
import type { CustomerRepo } from '../db/customer.repo.js';
import type { PlanGroupRepo, PlanRepo } from '../db/catalog.repo.js';
import type { EventRepo } from '../db/event.repo.js';

const SANDBOX_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SandboxResult {
  tenantId: string;
  apiKey: string;
  expiresAt: string;
  plans: { id: string; name: string; amountMinor: string }[];
  customer: { id: string; name: string; email: string };
}

export class SandboxService {
  private readonly createTenant: CreateTenantService;
  private readonly createCustomer: CreateCustomerService;
  private readonly createPlanGroup: CreatePlanGroupService;
  private readonly createPlan: CreatePlanService;

  constructor(
    tenantRepo: TenantRepo,
    customerRepo: CustomerRepo,
    planGroupRepo: PlanGroupRepo,
    planRepo: PlanRepo,
    eventRepo: EventRepo,
    uow: UnitOfWork,
    private readonly clock: Clock,
  ) {
    this.createTenant   = new CreateTenantService(tenantRepo, uow, clock);
    this.createCustomer = new CreateCustomerService(customerRepo, uow, clock);
    this.createPlanGroup = new CreatePlanGroupService(planGroupRepo, uow, clock);
    this.createPlan     = new CreatePlanService(planGroupRepo, planRepo, uow, clock);
  }

  async create(): Promise<SandboxResult> {
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + SANDBOX_TTL_MS);
    const label = ulid().slice(-6);

    const result = await this.createTenant.execute({
      name:      `Sandbox-${label}`,
      mode:      'test',
      expiresAt,
    });
    const tenantId = result.tenantId;
    const rawApiKey = result.rawApiKey!;

    const { planGroupId } = await this.createPlanGroup.execute({ tenantId, name: 'Core' });

    const [starter, pro, max] = await Promise.all([
      this.createPlan.execute({ tenantId, planGroupId, name: 'Starter', amountMinor: 200000n, billingInterval: 'month' }),
      this.createPlan.execute({ tenantId, planGroupId, name: 'Pro',     amountMinor: 500000n, billingInterval: 'month' }),
      this.createPlan.execute({ tenantId, planGroupId, name: 'Max',     amountMinor: 1200000n, billingInterval: 'month' }),
    ]);

    const { customerId } = await this.createCustomer.execute({
      tenantId,
      externalRef: 'sandbox_customer_001',
      name:  'Sandbox Customer',
      email: 'customer@sandbox.ng',
      phone: null,
    });

    return {
      tenantId,
      apiKey: rawApiKey,
      expiresAt: expiresAt.toISOString(),
      plans: [
        { id: starter.planId, name: 'Starter', amountMinor: '200000' },
        { id: pro.planId,     name: 'Pro',     amountMinor: '500000' },
        { id: max.planId,     name: 'Max',     amountMinor: '1200000' },
      ],
      customer: { id: customerId, name: 'Sandbox Customer', email: 'customer@sandbox.ng' },
    };
  }
}
