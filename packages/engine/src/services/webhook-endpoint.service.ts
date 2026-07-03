import { ulid } from 'ulid';
import { randomBytes } from 'crypto';
import type { Clock } from '../adapters/clock.js';
import { DrizzleWebhookEndpointRepo, type WebhookEndpoint } from '../db/webhook-endpoint.repo.js';
import { NotFoundError, InvalidRequestError } from '../domain/errors.js';

function newSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`;
}

export class WebhookEndpointService {
  constructor(
    private readonly repo: DrizzleWebhookEndpointRepo,
    private readonly clock: Clock,
  ) {}

  async create(tenantId: string, input: { url: string; description?: string | undefined; eventTypes?: string[] | undefined }): Promise<WebhookEndpoint> {
    if (!/^https?:\/\//.test(input.url)) {
      throw new InvalidRequestError('invalid_url', 'Webhook endpoint url must be an http(s) URL.');
    }
    const now = this.clock.now();
    const endpoint: WebhookEndpoint = {
      id:          `whep_${ulid()}`,
      tenantId,
      url:         input.url,
      secret:      newSecret(),
      description: input.description ?? null,
      enabled:     true,
      eventTypes:  input.eventTypes ?? [],
      createdAt:   now,
      updatedAt:   now,
    };
    await this.repo.create(endpoint);
    return endpoint;
  }

  list(tenantId: string): Promise<WebhookEndpoint[]> {
    return this.repo.listByTenant(tenantId);
  }

  async get(tenantId: string, id: string): Promise<WebhookEndpoint> {
    const e = await this.repo.findById(tenantId, id);
    if (!e) throw new NotFoundError('WebhookEndpoint', id);
    return e;
  }

  async update(tenantId: string, id: string, patch: { url?: string | undefined; description?: string | undefined; enabled?: boolean | undefined; eventTypes?: string[] | undefined }): Promise<WebhookEndpoint> {
    await this.get(tenantId, id); // 404 if missing
    if (patch.url !== undefined && !/^https?:\/\//.test(patch.url)) {
      throw new InvalidRequestError('invalid_url', 'Webhook endpoint url must be an http(s) URL.');
    }
    // Only forward keys that were actually provided (exactOptionalPropertyTypes-safe).
    const clean: Partial<Pick<WebhookEndpoint, 'url' | 'description' | 'enabled' | 'eventTypes'>> = {};
    if (patch.url !== undefined) clean.url = patch.url;
    if (patch.description !== undefined) clean.description = patch.description;
    if (patch.enabled !== undefined) clean.enabled = patch.enabled;
    if (patch.eventTypes !== undefined) clean.eventTypes = patch.eventTypes;
    await this.repo.update(tenantId, id, clean, this.clock.now());
    return this.get(tenantId, id);
  }

  // Rotate the signing secret. Returns the endpoint with the fresh whsec_ (shown once).
  async rotateSecret(tenantId: string, id: string): Promise<WebhookEndpoint> {
    await this.get(tenantId, id);
    await this.repo.update(tenantId, id, { secret: newSecret() }, this.clock.now());
    return this.get(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.get(tenantId, id);
    await this.repo.delete(tenantId, id);
  }
}
