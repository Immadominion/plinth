import { eq, and } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { virtualAccounts } from './schema.js';

export interface VirtualAccount {
  id:                   string;
  tenantId:             string;
  customerId:           string;
  accountRef:           string;
  nombaAccountHolderId: string;
  accountNumber:        string;
  bankName:             string;
  accountName:          string;
  createdAt:            Date;
}

export interface VirtualAccountRepo {
  findByCustomer(tenantId: string, customerId: string): Promise<VirtualAccount | null>;
  findByAccountRef(accountRef: string): Promise<VirtualAccount | null>;
  create(va: VirtualAccount, tx?: TxContext): Promise<void>;
}

type Row = typeof virtualAccounts.$inferSelect;

function toDomain(row: Row): VirtualAccount {
  return {
    id:                   row.id,
    tenantId:             row.tenantId,
    customerId:           row.customerId,
    accountRef:           row.accountRef,
    nombaAccountHolderId: row.nombaAccountHolderId,
    accountNumber:        row.accountNumber,
    bankName:             row.bankName,
    accountName:          row.accountName,
    createdAt:            row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleVirtualAccountRepo implements VirtualAccountRepo {
  async findByCustomer(tenantId: string, customerId: string): Promise<VirtualAccount | null> {
    const rows = await db
      .select()
      .from(virtualAccounts)
      .where(and(eq(virtualAccounts.tenantId, tenantId), eq(virtualAccounts.customerId, customerId)));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByAccountRef(accountRef: string): Promise<VirtualAccount | null> {
    const rows = await db
      .select()
      .from(virtualAccounts)
      .where(eq(virtualAccounts.accountRef, accountRef));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(va: VirtualAccount, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(virtualAccounts).values({
      id:                   va.id,
      tenantId:             va.tenantId,
      customerId:           va.customerId,
      accountRef:           va.accountRef,
      nombaAccountHolderId: va.nombaAccountHolderId,
      accountNumber:        va.accountNumber,
      bankName:             va.bankName,
      accountName:          va.accountName,
      createdAt:            va.createdAt,
    });
  }
}
