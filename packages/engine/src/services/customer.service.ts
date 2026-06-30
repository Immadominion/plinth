import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { CustomerRepo, Customer } from '../db/customer.repo.js';

export interface CreateCustomerInput {
  tenantId: string;
  externalRef: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface CreateCustomerResult {
  customerId: string;
  externalRef: string;
  name: string;
  createdAt: Date;
}

export class CreateCustomerService {
  constructor(
    private readonly customerRepo: CustomerRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateCustomerInput): Promise<CreateCustomerResult> {
    const now = this.clock.now();
    const id = `cus_${ulid()}`;

    const customer: Customer = {
      id,
      tenantId:            input.tenantId,
      externalRef:         input.externalRef,
      name:                input.name,
      email:               input.email,
      phone:               input.phone ?? null,
      accountBalanceMinor: 0n,
      createdAt:           now,
    };

    await this.uow.run(async (tx) => {
      await this.customerRepo.create(customer, tx);
    });

    return { customerId: id, externalRef: input.externalRef, name: input.name, createdAt: now };
  }
}
