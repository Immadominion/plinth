import type { InboundTransferRepo, InboundTransferEvent } from '../../src/db/inbound-transfer.repo.js';

export class InMemoryInboundTransferRepo implements InboundTransferRepo {
  private store = new Map<string, InboundTransferEvent>();

  all(): InboundTransferEvent[] { return [...this.store.values()]; }

  async findByNombaRequestId(nombaRequestId: string): Promise<InboundTransferEvent | null> {
    return [...this.store.values()].find((e) => e.nombaRequestId === nombaRequestId) ?? null;
  }

  async create(event: InboundTransferEvent): Promise<void> {
    if (this.store.has(event.nombaRequestId)) return; // dedup
    this.store.set(event.nombaRequestId, event);
  }
}
