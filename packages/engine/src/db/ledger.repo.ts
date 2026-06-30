import { eq, and, sql } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { ledgerEntries } from './schema.js';
import type { Kobo } from '../domain/money.js';
import type { LedgerEntry, LedgerEntryType } from '../domain/ledger-types.js';

export type { LedgerEntry, LedgerEntryType };

export interface LedgerRepo {
  append(entry: LedgerEntry, tx: TxContext): Promise<void>;
  sumBalance(tenantId: string, customerId: string, tx?: TxContext): Promise<Kobo>;
  listForCustomer(tenantId: string, customerId: string, tx?: TxContext): Promise<LedgerEntry[]>;
}

type LedgerRow = typeof ledgerEntries.$inferSelect;

function toDomain(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    invoiceId: row.invoiceId ?? null,
    type: row.type as LedgerEntryType,
    amountMinor: row.amountMinor,
    balanceAfterMinor: row.balanceAfterMinor,
    description: row.description,
    createdAt: row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleLedgerRepo implements LedgerRepo {
  async append(entry: LedgerEntry, tx: TxContext): Promise<void> {
    const client = fromTxContext(tx);
    await client.insert(ledgerEntries).values({
      id: entry.id,
      tenantId: entry.tenantId,
      customerId: entry.customerId,
      invoiceId: entry.invoiceId,
      type: entry.type,
      amountMinor: entry.amountMinor,
      balanceAfterMinor: entry.balanceAfterMinor,
      description: entry.description,
      createdAt: entry.createdAt,
    });
  }

  async sumBalance(tenantId: string, customerId: string, tx?: TxContext): Promise<Kobo> {
    const client = getClient(tx);
    const rows = await client
      .select({
        total: sql<string>`coalesce(sum(${ledgerEntries.amountMinor}), 0)`,
      })
      .from(ledgerEntries)
      .where(
        and(eq(ledgerEntries.tenantId, tenantId), eq(ledgerEntries.customerId, customerId)),
      );
    return BigInt(rows[0]?.total ?? '0');
  }

  async listForCustomer(tenantId: string, customerId: string, tx?: TxContext): Promise<LedgerEntry[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(ledgerEntries)
      .where(
        and(eq(ledgerEntries.tenantId, tenantId), eq(ledgerEntries.customerId, customerId)),
      )
      .orderBy(ledgerEntries.createdAt);
    return rows.map(toDomain);
  }
}
