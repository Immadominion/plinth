import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { cardTokens } from './schema.js';

export interface CardToken {
  id: string;
  tenantId: string;
  customerId: string;
  tokenKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DrizzleCardTokenRepo {
  async upsertByCustomer(token: CardToken): Promise<void> {
    await db
      .insert(cardTokens)
      .values(token)
      .onConflictDoUpdate({
        target: cardTokens.customerId,
        set: { tokenKey: token.tokenKey, updatedAt: token.updatedAt },
      });
  }

  async findByCustomerId(customerId: string): Promise<CardToken | null> {
    const rows = await db
      .select()
      .from(cardTokens)
      .where(eq(cardTokens.customerId, customerId))
      .limit(1);
    return rows[0] ?? null;
  }
}
