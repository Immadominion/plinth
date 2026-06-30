import { createHash, randomBytes } from 'crypto';
import { ulid } from 'ulid';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { TenantRepo } from '../db/tenant.repo.js';
import type { Clock } from '../adapters/clock.js';

export interface CreateTenantInput {
  name: string;
  mode: 'test' | 'live';
  expiresAt?: Date;
  skipApiKey?: boolean;
}

export interface CreateTenantResult {
  tenantId: string;
  name: string;
  rawApiKey: string | null;
  keyPrefix: string | null;
  mode: 'test' | 'live';
  createdAt: Date;
}

export class CreateTenantService {
  constructor(
    private readonly tenantRepo: TenantRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateTenantInput): Promise<CreateTenantResult> {
    const now = this.clock.now();
    const tenantId = `ten_${ulid()}`;

    if (input.skipApiKey) {
      await this.uow.run(async (tx) => {
        await this.tenantRepo.create({ id: tenantId, name: input.name, createdAt: now, expiresAt: input.expiresAt ?? null }, tx);
      });
      return { tenantId, name: input.name, rawApiKey: null, keyPrefix: null, mode: input.mode, createdAt: now };
    }

    const keyId = `key_${ulid()}`;
    const rawSecret = randomBytes(32).toString('hex');
    const prefix = input.mode === 'test' ? 'sk_test_' : 'sk_live_';
    const rawApiKey = `${prefix}${rawSecret}`;
    const keyHash = createHash('sha256').update(rawApiKey).digest('hex');
    const keyPrefix = rawApiKey.slice(0, 12);

    await this.uow.run(async (tx) => {
      await this.tenantRepo.create({ id: tenantId, name: input.name, createdAt: now, expiresAt: input.expiresAt ?? null }, tx);
      await this.tenantRepo.createApiKey(
        { id: keyId, tenantId, keyPrefix, keyHash, mode: input.mode, createdAt: now, revokedAt: null },
        tx,
      );
    });

    return { tenantId, name: input.name, rawApiKey, keyPrefix, mode: input.mode, createdAt: now };
  }
}
