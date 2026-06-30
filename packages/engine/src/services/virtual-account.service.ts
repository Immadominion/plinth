import { ulid } from 'ulid';
import type { NombaAdapter } from '../adapters/nomba.js';
import type { VirtualAccountRepo, VirtualAccount } from '../db/virtual-account.repo.js';
import type { CustomerRepo } from '../db/customer.repo.js';
import type { Clock } from '../adapters/clock.js';
import { NotFoundError } from '../domain/errors.js';

export class ProvisionVirtualAccountService {
  constructor(
    private readonly nomba: NombaAdapter,
    private readonly virtualAccountRepo: VirtualAccountRepo,
    private readonly customerRepo: CustomerRepo,
    private readonly clock: Clock,
  ) {}

  async execute(params: { tenantId: string; customerId: string }): Promise<VirtualAccount> {
    const { tenantId, customerId } = params;

    const customer = await this.customerRepo.findById(tenantId, customerId);
    if (!customer) throw new NotFoundError('Customer', customerId);

    // Idempotent: return existing VA if already provisioned
    const existing = await this.virtualAccountRepo.findByCustomer(tenantId, customerId);
    if (existing) return existing;

    const accountRef = customerId; // use customer id as the stable reference
    const result = await this.nomba.createVirtualAccount({
      accountRef,
      accountName: customer.name,
      tenantId,
    });

    const va: VirtualAccount = {
      id:                   `va_${ulid()}`,
      tenantId,
      customerId,
      accountRef,
      nombaAccountHolderId: result.nombaAccountHolderId,
      accountNumber:        result.accountNumber,
      bankName:             result.bankName,
      accountName:          result.accountName,
      createdAt:            this.clock.now(),
    };

    await this.virtualAccountRepo.create(va);
    return va;
  }
}
