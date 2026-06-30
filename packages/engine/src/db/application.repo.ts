import { eq, desc, and } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { tenantApplications } from './schema.js';

export interface TenantApplication {
  id: string;
  businessName: string;
  email: string;
  rcNumber: string | null;
  website: string | null;
  contactName: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  nombaSubAccountId: string | null;
  tenantId: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface ApplicationRepo {
  findById(id: string, tx?: TxContext): Promise<TenantApplication | null>;
  findByEmail(email: string): Promise<TenantApplication | null>;
  findAll(tx?: TxContext): Promise<TenantApplication[]>;
  create(app: TenantApplication, tx?: TxContext): Promise<void>;
  update(id: string, patch: Partial<Pick<TenantApplication, 'status' | 'nombaSubAccountId' | 'tenantId' | 'rejectionReason' | 'reviewedAt'>>, tx?: TxContext): Promise<void>;
}

type Row = typeof tenantApplications.$inferSelect;

function toDomain(row: Row): TenantApplication {
  return {
    id:                row.id,
    businessName:      row.businessName,
    email:             row.email,
    rcNumber:          row.rcNumber ?? null,
    website:           row.website ?? null,
    contactName:       row.contactName,
    description:       row.description ?? null,
    status:            row.status as 'pending' | 'approved' | 'rejected',
    nombaSubAccountId: row.nombaSubAccountId ?? null,
    tenantId:          row.tenantId ?? null,
    rejectionReason:   row.rejectionReason ?? null,
    reviewedAt:        row.reviewedAt ?? null,
    createdAt:         row.createdAt,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleApplicationRepo implements ApplicationRepo {
  async findById(id: string, tx?: TxContext): Promise<TenantApplication | null> {
    const client = getClient(tx);
    const rows = await client.select().from(tenantApplications).where(eq(tenantApplications.id, id));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<TenantApplication | null> {
    const rows = await db
      .select()
      .from(tenantApplications)
      .where(and(eq(tenantApplications.email, email), eq(tenantApplications.status, 'approved')));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findAll(tx?: TxContext): Promise<TenantApplication[]> {
    const client = getClient(tx);
    const rows = await client.select().from(tenantApplications).orderBy(desc(tenantApplications.createdAt));
    return rows.map(toDomain);
  }

  async create(app: TenantApplication, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(tenantApplications).values({
      id:                app.id,
      businessName:      app.businessName,
      email:             app.email,
      rcNumber:          app.rcNumber,
      website:           app.website,
      contactName:       app.contactName,
      description:       app.description,
      status:            app.status,
      nombaSubAccountId: app.nombaSubAccountId,
      tenantId:          app.tenantId,
      rejectionReason:   app.rejectionReason,
      reviewedAt:        app.reviewedAt,
      createdAt:         app.createdAt,
    });
  }

  async update(
    id: string,
    patch: Partial<Pick<TenantApplication, 'status' | 'nombaSubAccountId' | 'tenantId' | 'rejectionReason' | 'reviewedAt'>>,
    tx?: TxContext,
  ): Promise<void> {
    const client = getClient(tx);
    await client.update(tenantApplications).set(patch).where(eq(tenantApplications.id, id));
  }
}
