import { eq, isNull } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { suspenseItems } from './schema.js';

export interface SuspenseItem {
  id:             string;
  tenantId:       string | null;
  amountMinor:    bigint;
  accountRef:     string;
  narration:      string;
  nombaRequestId: string;
  reason:         'no_va' | 'no_open_invoice' | 'manual';
  resolvedAt:     Date | null;
  resolvedNote:   string | null;
  createdAt:      Date;
}

export interface SuspenseRepo {
  findById(id: string): Promise<SuspenseItem | null>;
  findUnresolved(tenantId?: string): Promise<SuspenseItem[]>;
  create(item: SuspenseItem, tx?: TxContext): Promise<void>;
  resolve(id: string, note: string, now: Date): Promise<void>;
}

type Row = typeof suspenseItems.$inferSelect;

function toDomain(row: Row): SuspenseItem {
  return {
    id:             row.id,
    tenantId:       row.tenantId ?? null,
    amountMinor:    row.amountMinor,
    accountRef:     row.accountRef,
    narration:      row.narration,
    nombaRequestId: row.nombaRequestId,
    reason:         row.reason as SuspenseItem['reason'],
    resolvedAt:     row.resolvedAt ?? null,
    resolvedNote:   row.resolvedNote ?? null,
    createdAt:      row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleSuspenseRepo implements SuspenseRepo {
  async findById(id: string): Promise<SuspenseItem | null> {
    const rows = await db
      .select()
      .from(suspenseItems)
      .where(eq(suspenseItems.id, id));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findUnresolved(tenantId?: string): Promise<SuspenseItem[]> {
    const rows = await db
      .select()
      .from(suspenseItems)
      .where(isNull(suspenseItems.resolvedAt));
    const all = rows.map(toDomain);
    if (tenantId === undefined) return all;
    return all.filter((s) => s.tenantId === tenantId);
  }

  async create(item: SuspenseItem, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(suspenseItems).values({
      id:             item.id,
      tenantId:       item.tenantId,
      amountMinor:    item.amountMinor,
      accountRef:     item.accountRef,
      narration:      item.narration,
      nombaRequestId: item.nombaRequestId,
      reason:         item.reason,
      resolvedAt:     item.resolvedAt,
      resolvedNote:   item.resolvedNote,
      createdAt:      item.createdAt,
    });
  }

  async resolve(id: string, note: string, now: Date): Promise<void> {
    await db
      .update(suspenseItems)
      .set({ resolvedAt: now, resolvedNote: note })
      .where(eq(suspenseItems.id, id));
  }
}
