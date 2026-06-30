import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { clockState } from '../db/schema.js';

export interface Clock {
  now(): Date;
}

export class RealClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class TestClock implements Clock {
  private cached: Date | null = null;

  now(): Date {
    return this.cached ?? new Date();
  }

  async refresh(): Promise<void> {
    const rows = await db.select().from(clockState).where(eq(clockState.id, 'global'));
    const row = rows[0];
    if (!row || row.mode !== 'test' || !row.simulatedNow) {
      this.cached = null; // real mode — fall back to new Date()
      return;
    }
    this.cached = row.simulatedNow;
  }

  static async advance(seconds: number): Promise<Date> {
    const rows = await db.select().from(clockState).where(eq(clockState.id, 'global'));
    const row = rows[0];
    const current = row?.simulatedNow ?? new Date();
    const next = new Date(current.getTime() + seconds * 1000);

    await db
      .insert(clockState)
      .values({ id: 'global', mode: 'test', simulatedNow: next, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: clockState.id,
        set: { mode: 'test', simulatedNow: next, updatedAt: new Date() },
      });

    return next;
  }
}
