import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { ApplicationRepo, TenantApplication } from '../db/application.repo.js';
import { CreateTenantService } from './tenant.service.js';
import type { TenantRepo } from '../db/tenant.repo.js';
import type { AuthService } from './auth.service.js';

export interface SubmitApplicationInput {
  businessName: string;
  email: string;
  rcNumber?: string;
  website?: string;
  contactName: string;
  description?: string;
}

export interface ApproveApplicationInput {
  nombaSubAccountId: string;
}

export class ApplicationService {
  private readonly createTenant: CreateTenantService;

  constructor(
    private readonly applicationRepo: ApplicationRepo,
    tenantRepo: TenantRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly authService: AuthService,
  ) {
    this.createTenant = new CreateTenantService(tenantRepo, uow, clock);
  }

  async submit(input: SubmitApplicationInput): Promise<TenantApplication> {
    const now = this.clock.now();
    const app: TenantApplication = {
      id:                `app_${ulid()}`,
      businessName:      input.businessName,
      email:             input.email,
      rcNumber:          input.rcNumber ?? null,
      website:           input.website ?? null,
      contactName:       input.contactName,
      description:       input.description ?? null,
      status:            'pending',
      nombaSubAccountId: null,
      tenantId:          null,
      rejectionReason:   null,
      reviewedAt:        null,
      createdAt:         now,
    };
    await this.applicationRepo.create(app);
    return app;
  }

  async approve(id: string, input: ApproveApplicationInput): Promise<{ tenantId: string }> {
    const app = await this.applicationRepo.findById(id);
    if (!app) throw new Error('Application not found');
    if (app.status !== 'pending') throw new Error('Application is not pending');

    const result = await this.createTenant.execute({
      name:       app.businessName,
      mode:       'live',
      skipApiKey: true,
    });

    await this.applicationRepo.update(id, {
      status:            'approved',
      nombaSubAccountId: input.nombaSubAccountId,
      tenantId:          result.tenantId,
      reviewedAt:        this.clock.now(),
    });

    await this.authService.issueClaimAndNotify({
      tenantId:     result.tenantId,
      toEmail:      app.email,
      businessName: app.businessName,
    });

    return { tenantId: result.tenantId };
  }

  async reject(id: string, reason: string): Promise<void> {
    const app = await this.applicationRepo.findById(id);
    if (!app) throw new Error('Application not found');
    if (app.status !== 'pending') throw new Error('Application is not pending');

    await this.applicationRepo.update(id, {
      status:          'rejected',
      rejectionReason: reason,
      reviewedAt:      this.clock.now(),
    });
  }

  async list(): Promise<TenantApplication[]> {
    return this.applicationRepo.findAll();
  }

  async getById(id: string): Promise<TenantApplication | null> {
    return this.applicationRepo.findById(id);
  }
}
