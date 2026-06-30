import { ulid } from 'ulid';
import type { UnitOfWork, TxContext } from '../db/unit-of-work.js';
import type { Clock } from '../adapters/clock.js';
import type { CustomerRepo } from '../db/customer.repo.js';
import type { LedgerRepo } from '../db/ledger.repo.js';
import type { Kobo } from '../domain/money.js';
import type { LedgerEntry, LedgerEntryType } from '../domain/ledger-types.js';
import { NotFoundError } from '../domain/errors.js';

export interface PostLedgerEntryInput {
  tenantId: string;
  customerId: string;
  type: LedgerEntryType;
  amountMinor: Kobo;
  description: string;
  invoiceId?: string | null;
}

export interface PostLedgerEntryResult {
  entry: LedgerEntry;
  balanceAfterMinor: Kobo;
}

export class PostLedgerEntryService {
  constructor(
    private readonly customerRepo: CustomerRepo,
    private readonly ledgerRepo: LedgerRepo,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async executeInTx(input: PostLedgerEntryInput, tx: TxContext): Promise<PostLedgerEntryResult> {
    const now = this.clock.now();

    const customer = await this.customerRepo.findForUpdate(input.tenantId, input.customerId, tx);
    if (!customer) throw new NotFoundError('Customer', input.customerId);

    const balanceAfterMinor = customer.accountBalanceMinor + input.amountMinor;

    const entry: LedgerEntry = {
      id:               `led_${ulid()}`,
      tenantId:         input.tenantId,
      customerId:       input.customerId,
      invoiceId:        input.invoiceId ?? null,
      type:             input.type,
      amountMinor:      input.amountMinor,
      balanceAfterMinor,
      description:      input.description,
      createdAt:        now,
    };
    await this.ledgerRepo.append(entry, tx);

    await this.customerRepo.updateBalance(input.tenantId, input.customerId, balanceAfterMinor, tx);

    return { entry, balanceAfterMinor };
  }

  async execute(input: PostLedgerEntryInput): Promise<PostLedgerEntryResult> {
    return this.uow.run((tx) => this.executeInTx(input, tx));
  }
}
