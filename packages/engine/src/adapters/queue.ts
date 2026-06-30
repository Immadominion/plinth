import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { ulid } from 'ulid';

export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface JobOptions {
  jobId?: string;
  delay?: number;
  attempts?: number;
  backoff?: { type: 'exponential'; delay: number };
}

export interface JobQueue {
  enqueue(queueName: string, payload: JobPayload, opts?: JobOptions): Promise<string>;
  getJobStatus(queueName: string, jobId: string): Promise<'active' | 'waiting' | 'completed' | 'failed' | 'unknown'>;
  close(): Promise<void>;
}

export class BullMQJobQueue implements JobQueue {
  private queues = new Map<string, Queue>();

  constructor(private readonly connection: ConnectionOptions) {}

  private getQueue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  async enqueue(queueName: string, payload: JobPayload, opts?: JobOptions): Promise<string> {
    const queue = this.getQueue(queueName);
    const jobOptions: JobsOptions = {
      attempts: opts?.attempts ?? 5,
      backoff: opts?.backoff ?? { type: 'exponential', delay: 2000 },
    };
    if (opts?.jobId !== undefined) jobOptions.jobId = opts.jobId;
    if (opts?.delay !== undefined) jobOptions.delay = opts.delay;
    const job = await queue.add(payload.type, payload.data, jobOptions);
    return job.id ?? '';
  }

  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<'active' | 'waiting' | 'completed' | 'failed' | 'unknown'> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) return 'unknown';
    const state = await job.getState();
    if (state === 'active') return 'active';
    if (state === 'waiting' || state === 'delayed') return 'waiting';
    if (state === 'completed') return 'completed';
    if (state === 'failed') return 'failed';
    return 'unknown';
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    this.queues.clear();
  }
}

interface StoredJob {
  id: string;
  queueName: string;
  payload: JobPayload;
  status: 'waiting' | 'active' | 'completed' | 'failed';
}

export class InMemoryJobQueue implements JobQueue {
  private jobs = new Map<string, StoredJob>();

  async enqueue(queueName: string, payload: JobPayload, opts?: JobOptions): Promise<string> {
    const id = opts?.jobId ?? `job_${ulid()}`;
    this.jobs.set(id, { id, queueName, payload, status: 'waiting' });
    return id;
  }

  async getJobStatus(
    _queueName: string,
    jobId: string,
  ): Promise<'active' | 'waiting' | 'completed' | 'failed' | 'unknown'> {
    return this.jobs.get(jobId)?.status ?? 'unknown';
  }

  async close(): Promise<void> {
    this.jobs.clear();
  }

  allJobs(): StoredJob[] {
    return [...this.jobs.values()];
  }
}
