import { eq, and, asc, desc, or } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { invoices, invoiceLineItems } from './schema.js';
import type { Kobo } from '../domain/money.js';
import type { InvoiceState, BillingMode } from '../domain/state-machines/invoice.js';

export type { InvoiceState, BillingMode };

export interface InvoiceLineItem {
  id: string;
  tenantId: string;
  invoiceId: string;
  description: string;
  amountMinor: bigint;
  quantity: number;
  type: 'subscription' | 'proration' | 'credit' | 'adjustment';
  createdAt: Date;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  subscriptionId: string;
  state: InvoiceState;
  currency: 'NGN';
  amountDueMinor: Kobo;
  amountPaidMinor: Kobo;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date;
  billingMode: BillingMode;
  isReceivable: boolean;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceRepo {
  findById(tenantId: string, id: string, tx?: TxContext): Promise<Invoice | null>;
  findForUpdate(tenantId: string, id: string, tx: TxContext): Promise<Invoice | null>;
  findOldestOpen(tenantId: string, customerId: string, tx?: TxContext): Promise<Invoice | null>;
  findOldestPayable(tenantId: string, customerId: string, tx?: TxContext): Promise<Invoice | null>;
  findBySubscription(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<Invoice[]>;
  findAll(tenantId: string, tx?: TxContext): Promise<Invoice[]>;
  create(invoice: Invoice, tx?: TxContext): Promise<void>;
  update(invoice: Invoice, tx: TxContext): Promise<void>;
  createLineItems(items: InvoiceLineItem[], tx: TxContext): Promise<void>;
}

type Row = typeof invoices.$inferSelect;

function toDomain(row: Row): Invoice {
  return {
    id:              row.id,
    tenantId:        row.tenantId,
    customerId:      row.customerId,
    subscriptionId:  row.subscriptionId,
    state:           row.state,
    currency:        'NGN',
    amountDueMinor:  row.amountDueMinor,
    amountPaidMinor: row.amountPaidMinor,
    periodStart:     row.periodStart,
    periodEnd:       row.periodEnd,
    dueAt:           row.dueAt,
    billingMode:     row.billingMode,
    isReceivable:    row.isReceivable,
    closedAt:        row.closedAt ?? null,
    createdAt:       row.createdAt,
    updatedAt:       row.updatedAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleInvoiceRepo implements InvoiceRepo {
  async findById(tenantId: string, id: string, tx?: TxContext): Promise<Invoice | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findForUpdate(tenantId: string, id: string, tx: TxContext): Promise<Invoice | null> {
    const client = fromTxContext(tx);
    const rows = await client
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)))
      .for('update');
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findOldestOpen(tenantId: string, customerId: string, tx?: TxContext): Promise<Invoice | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.customerId, customerId),
          eq(invoices.state, 'open'),
        ),
      )
      .orderBy(asc(invoices.dueAt))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findOldestPayable(tenantId: string, customerId: string, tx?: TxContext): Promise<Invoice | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.customerId, customerId),
          or(eq(invoices.state, 'open'), eq(invoices.state, 'partially_paid')),
        ),
      )
      .orderBy(asc(invoices.dueAt))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findBySubscription(tenantId: string, subscriptionId: string, tx?: TxContext): Promise<Invoice[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.subscriptionId, subscriptionId)))
      .orderBy(asc(invoices.createdAt));
    return rows.map(toDomain);
  }

  async findAll(tenantId: string, tx?: TxContext): Promise<Invoice[]> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.createdAt));
    return rows.map(toDomain);
  }

  async create(invoice: Invoice, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(invoices).values({
      id:              invoice.id,
      tenantId:        invoice.tenantId,
      customerId:      invoice.customerId,
      subscriptionId:  invoice.subscriptionId,
      state:           invoice.state,
      currency:        invoice.currency,
      amountDueMinor:  invoice.amountDueMinor,
      amountPaidMinor: invoice.amountPaidMinor,
      periodStart:     invoice.periodStart,
      periodEnd:       invoice.periodEnd,
      dueAt:           invoice.dueAt,
      billingMode:     invoice.billingMode,
      isReceivable:    invoice.isReceivable,
      closedAt:        invoice.closedAt,
      createdAt:       invoice.createdAt,
      updatedAt:       invoice.updatedAt,
    });
  }

  async update(invoice: Invoice, tx: TxContext): Promise<void> {
    const client = fromTxContext(tx);
    await client
      .update(invoices)
      .set({
        state:           invoice.state,
        amountDueMinor:  invoice.amountDueMinor,
        amountPaidMinor: invoice.amountPaidMinor,
        billingMode:     invoice.billingMode,
        isReceivable:    invoice.isReceivable,
        closedAt:        invoice.closedAt,
        updatedAt:       invoice.updatedAt,
      })
      .where(and(eq(invoices.tenantId, invoice.tenantId), eq(invoices.id, invoice.id)));
  }

  async createLineItems(items: InvoiceLineItem[], tx: TxContext): Promise<void> {
    if (items.length === 0) return;
    const client = fromTxContext(tx);
    await client.insert(invoiceLineItems).values(
      items.map((item) => ({
        id:          item.id,
        tenantId:    item.tenantId,
        invoiceId:   item.invoiceId,
        description: item.description,
        amountMinor: item.amountMinor,
        quantity:    item.quantity,
        type:        item.type,
        createdAt:   item.createdAt,
      })),
    );
  }
}
