import type { EventRepo } from '../db/event.repo.js';
import type { JobQueue } from '../adapters/queue.js';
import { buildSignatureHeader } from '../webhook/sign-payload.js';

export class RelayOutboxService {
  constructor(
    private readonly eventRepo: EventRepo,
    private readonly jobQueue: JobQueue,
    private readonly webhookSecret: string,
  ) {}

  async relay(limit = 100): Promise<number> {
    const pending = await this.eventRepo.findPendingDelivery(limit);
    if (pending.length === 0) return 0;

    const delivered: string[] = [];

    await Promise.all(
      pending.map(async (event) => {
        const payload = JSON.stringify(event.payload);
        const ts = Math.floor(event.occurredAt.getTime() / 1000);
        const signature = buildSignatureHeader(this.webhookSecret, ts, payload);

        await this.jobQueue.enqueue(
          'webhook.deliver',
          {
            type: 'webhook.deliver',
            data: {
              eventId:   event.id,
              tenantId:  event.tenantId,
              eventType: event.type,
              payload:   event.payload,
              signature,
              timestamp: ts,
            },
          },
          {
            jobId:    `wh_${event.id}`,
            attempts: 5,
            backoff:  { type: 'exponential', delay: 2000 },
          },
        );

        delivered.push(event.id);
      }),
    );

    if (delivered.length > 0) {
      await this.eventRepo.markDelivered(delivered);
    }

    return delivered.length;
  }
}
