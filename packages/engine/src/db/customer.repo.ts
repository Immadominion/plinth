import { eq, and } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { customers } from './schema.js';
import type { Kobo } from '../domain/money.js';

export interface Customer {
  id: string;
  tenantId: string;
  externalRef: string;
  name: string;
  email: string;
  phone: string | null;
  accountBalanceMinor: Kobo;
  createdAt: Date;
}

export interface CustomerRepo {
  findAll(tenantId: string): Promise<Customer[]>;
  findById(tenantId: string, id: string, tx?: TxContext): Promise<Customer | null>;
  findByExternalRef(tenantId: string, externalRef: string, tx?: TxContext): Promise<Customer | null>;
  findForUpdate(tenantId: string, id: string, tx: TxContext): Promise<Customer | null>;
  create(customer: Customer, tx?: TxContext): Promise<void>;
  updateBalance(tenantId: string, id: string, balanceMinor: Kobo, tx: TxContext): Promise<void>;
}

type CustomerRow = typeof customers.$inferSelect;

function toDomain(row: CustomerRow): Customer {
  return {
    id: row.id,
    tenantId: row.tenantId,
    externalRef: row.externalRef,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    accountBalanceMinor: row.accountBalanceMinor,
    createdAt: row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleCustomerRepo implements CustomerRepo {
  async findAll(tenantId: string): Promise<Customer[]> {
    const rows = await db.select().from(customers).where(eq(customers.tenantId, tenantId));
    return rows.map(toDomain);
  }

  async findById(tenantId: string, id: string, tx?: TxContext): Promise<Customer | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByExternalRef(tenantId: string, externalRef: string, tx?: TxContext): Promise<Customer | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.externalRef, externalRef)));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findForUpdate(tenantId: string, id: string, tx: TxContext): Promise<Customer | null> {
    const client = fromTxContext(tx);
    const rows = await client
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)))
      .for('update');
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(customer: Customer, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(customers).values({
      id: customer.id,
      tenantId: customer.tenantId,
      externalRef: customer.externalRef,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      accountBalanceMinor: customer.accountBalanceMinor,
      createdAt: customer.createdAt,
    });
  }

  async updateBalance(tenantId: string, id: string, balanceMinor: Kobo, tx: TxContext): Promise<void> {
    const client = fromTxContext(tx);
    await client
      .update(customers)
      .set({ accountBalanceMinor: balanceMinor })
      .where(and(eq(customers.tenantId, tenantId), eq(customers.id, id)));
  }
}
