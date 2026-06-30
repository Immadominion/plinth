import { eq, and, isNull, lt } from 'drizzle-orm';
import { db } from './client.js';
import { claimTokens } from './schema.js';

export interface ClaimToken {
  id: string;
  tenantId: string;
  tokenHash: string;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface ClaimTokenRepo {
  create(token: ClaimToken): Promise<void>;
  findByHash(tokenHash: string): Promise<ClaimToken | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
}

type Row = typeof claimTokens.$inferSelect;

function toDomain(row: Row): ClaimToken {
  return {
    id:        row.id,
    tenantId:  row.tenantId,
    tokenHash: row.tokenHash,
    usedAt:    row.usedAt ?? null,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export class DrizzleClaimTokenRepo implements ClaimTokenRepo {
  async create(token: ClaimToken): Promise<void> {
    await db.insert(claimTokens).values({
      id:        token.id,
      tenantId:  token.tenantId,
      tokenHash: token.tokenHash,
      usedAt:    token.usedAt,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
    });
  }

  async findByHash(tokenHash: string): Promise<ClaimToken | null> {
    const rows = await db
      .select()
      .from(claimTokens)
      .where(and(eq(claimTokens.tokenHash, tokenHash), isNull(claimTokens.usedAt)));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async markUsed(id: string, usedAt: Date): Promise<void> {
    await db.update(claimTokens).set({ usedAt }).where(eq(claimTokens.id, id));
  }
}
