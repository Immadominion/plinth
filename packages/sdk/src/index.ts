// Plinth SDK — scaffold. Phase 1+ fills in resource methods.
export interface EngineClientOptions {
  baseUrl: string;
  apiKey: string;
}

export class NombaSubsClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(opts: EngineClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.apiKey = opts.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json();
    if (!res.ok) throw Object.assign(new Error((json as { message?: string }).message ?? res.statusText), { status: res.status, body: json });
    return json as T;
  }

  async createTenant(params: { name: string; mode: 'test' | 'live' }): Promise<{
    object: 'tenant';
    id: string;
    name: string;
    api_key: string;
    key_prefix: string;
    mode: 'test' | 'live';
    created_at: string;
  }> {
    return this.request('POST', '/v1/tenants', params);
  }
}
