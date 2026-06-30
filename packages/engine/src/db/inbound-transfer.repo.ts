import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { inboundTransferEvents } from './schema.js';

export interface InboundTransferEvent {
  id:             string;
  nombaRequestId: string;
  accountRef:     string;
  amountMinor:    bigint;
  narration:      string;
  sessionId:      string;
  tenantId:       string | null;
  customerId:     string | null;
  invoiceId:      string | null;
  outcome:        'paid' | 'partial' | 'overpaid' | 'suspense';
  createdAt:      Date;
}

export interface InboundTransferRepo {
  findByNombaRequestId(nombaRequestId: string): Promise<InboundTransferEvent | null>;
  create(event: InboundTransferEvent): Promise<void>;
}

type Row = typeof inboundTransferEvents.$inferSelect;

function toDomain(row: Row): InboundTransferEvent {
  return {
    id:             row.id,
    nombaRequestId: row.nombaRequestId,
    accountRef:     row.accountRef,
    amountMinor:    row.amountMinor,
    narration:      row.narration,
    sessionId:      row.sessionId,
    tenantId:       row.tenantId ?? null,
    customerId:     row.customerId ?? null,
    invoiceId:      row.invoiceId ?? null,
    outcome:        row.outcome as InboundTransferEvent['outcome'],
    createdAt:      row.createdAt,
  };
}

export class DrizzleInboundTransferRepo implements InboundTransferRepo {
  async findByNombaRequestId(nombaRequestId: string): Promise<InboundTransferEvent | null> {
    const rows = await db
      .select()
      .from(inboundTransferEvents)
      .where(eq(inboundTransferEvents.nombaRequestId, nombaRequestId));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async create(event: InboundTransferEvent): Promise<void> {
    await db.insert(inboundTransferEvents).values({
      id:             event.id,
      nombaRequestId: event.nombaRequestId,
      accountRef:     event.accountRef,
      amountMinor:    event.amountMinor,
      narration:      event.narration,
      sessionId:      event.sessionId,
      tenantId:       event.tenantId,
      customerId:     event.customerId,
      invoiceId:      event.invoiceId,
      outcome:        event.outcome,
      createdAt:      event.createdAt,
    });
  }
}
