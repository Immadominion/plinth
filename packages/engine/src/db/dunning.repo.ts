import { eq, and, desc } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { dunningAttempts } from './schema.js';

export interface DunningAttempt {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceId: string;
  attemptNumber: number;
  declineCode: string;
  declineType: 'soft' | 'hard';
  nextRetryAt: Date | null;
  attemptedAt: Date;
  createdAt: Date;
}

export interface DunningAttemptRepo {
  countBySub(tenantId: string, subscriptionId: string): Promise<number>;
  create(attempt: DunningAttempt, tx?: TxContext): Promise<void>;
  findLatest(tenantId: string, subscriptionId: string): Promise<DunningAttempt | null>;
}

type Row = typeof dunningAttempts.$inferSelect;

function toDomain(row: Row): DunningAttempt {
  return {
    id:             row.id,
    tenantId:       row.tenantId,
    subscriptionId: row.subscriptionId,
    invoiceId:      row.invoiceId,
    attemptNumber:  row.attemptNumber,
    declineCode:    row.declineCode,
    declineType:    row.declineType as 'soft' | 'hard',
    nextRetryAt:    row.nextRetryAt ?? null,
    attemptedAt:    row.attemptedAt,
    createdAt:      row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleDunningAttemptRepo implements DunningAttemptRepo {
  async countBySub(_tenantId: string, subscriptionId: string): Promise<number> {
    const rows = await db
      .select()
      .from(dunningAttempts)
      .where(eq(dunningAttempts.subscriptionId, subscriptionId));
    return rows.length;
  }

  async create(attempt: DunningAttempt, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(dunningAttempts).values({
      id:             attempt.id,
      tenantId:       attempt.tenantId,
      subscriptionId: attempt.subscriptionId,
      invoiceId:      attempt.invoiceId,
      attemptNumber:  attempt.attemptNumber,
      declineCode:    attempt.declineCode,
      declineType:    attempt.declineType,
      nextRetryAt:    attempt.nextRetryAt,
      attemptedAt:    attempt.attemptedAt,
      createdAt:      attempt.createdAt,
    });
  }

  async findLatest(_tenantId: string, subscriptionId: string): Promise<DunningAttempt | null> {
    const rows = await db
      .select()
      .from(dunningAttempts)
      .where(eq(dunningAttempts.subscriptionId, subscriptionId))
      .orderBy(desc(dunningAttempts.attemptedAt))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }
}
