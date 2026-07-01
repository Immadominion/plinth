const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7331';

function getKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('nomba_api_key') ?? '';
}

function getTenantId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('nomba_tenant_id') ?? '';
}

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '';
  return request<T>(path, {
    ...options,
    headers: { Authorization: `Bearer ${adminKey}`, ...options?.headers },
  });
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getKey()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nomba_api_key');
  localStorage.removeItem('nomba_tenant_id');
}

export const api = {
  me: {
    get: () => request<{ id: string; name: string; created_at: string }>('/v1/me'),
  },
  customers: {
    list:          ()         => request('/v1/customers'),
    get:           (id: string)  => request(`/v1/customers/${id}`),
    entitlements:  (id: string)  => request(`/v1/customers/${id}/entitlements`),
    create:        (data: unknown) => request('/v1/customers', { method: 'POST', body: JSON.stringify(data) }),
    virtualAccount:(id: string)  => request(`/v1/customers/${id}/virtual-account`, { method: 'POST' }),
  },
  subscriptions: {
    list:          ()         => request('/v1/subscriptions'),
    get:           (id: string)  => request(`/v1/subscriptions/${id}`),
    status:        (id: string)  => request(`/v1/subscriptions/${id}/status`),
    create:        (data: unknown) => request('/v1/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    checkoutLink:  (id: string)  => request<{ checkoutLink: string; orderReference: string; customerId: string; subscriptionId: string }>(`/v1/subscriptions/${id}/checkout-link`, { method: 'POST', body: '{}' }),
    previewChange: (id: string, data: unknown) => request(`/v1/subscriptions/${id}/preview-change`, { method: 'POST', body: JSON.stringify(data) }),
    change:        (id: string, data: unknown) => request(`/v1/subscriptions/${id}/change`, { method: 'POST', body: JSON.stringify(data) }),
  },
  plans: {
    list:   ()            => request('/v1/plans'),
    create: (data: unknown) => request('/v1/plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => request(`/v1/plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ archived: boolean; deleted: boolean }>(`/v1/plans/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list:   ()            => request('/v1/invoices'),
  },
  policy: {
    get:         ()                     => request('/v1/policy'),
    update:      (data: unknown)        => request('/v1/policy', { method: 'PUT', body: JSON.stringify(data) }),
    applyPreset: (preset: string)       => request('/v1/policy/preset', { method: 'POST', body: JSON.stringify({ preset }) }),
  },
  // Dev-only: simulate a Nomba payment_success webhook so a card token gets wired
  // onto the customer's subscriptions (no real checkout needed in fake-Nomba mode).
  webhooks: {
    simulatePayment: (orderReference: string, amountMinor: number) =>
      fetch(`${API_BASE}/webhooks/nomba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'payment_success',
          requestId:  `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          data: {
            transaction: {
              type:              'card_payment',
              transactionAmount: amountMinor,
              orderReference,
            },
            tokenizedCardData: { tokenKey: `tok_test_${Math.random().toString(36).slice(2, 12)}` },
          },
        }),
      }).then((r) => { if (!r.ok) throw new Error(`Simulate failed ${r.status}`); return r.json(); }),
  },
  planGroups: {
    list:   ()            => request('/v1/plan-groups'),
    create: (data: unknown) => request('/v1/plan-groups', { method: 'POST', body: JSON.stringify(data) }),
  },
  clock: {
    get:     ()               => request('/admin/clock'),
    advance: (advanceSeconds: number) => request('/admin/clock/advance', { method: 'POST', body: JSON.stringify({ advanceSeconds }) }),
    reset:   ()               => request('/admin/clock/reset', { method: 'POST' }),
  },
  tick: {
    run: () => request(`/admin/tick?tenant_id=${getTenantId()}`, { method: 'POST' }),
  },
  suspense: {
    list:    ()                      => request('/admin/suspense'),
    resolve: (id: string, note: string) => request(`/admin/suspense/${id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) }),
  },
  sandbox: {
    create: (data: unknown) => request('/sandbox', { method: 'POST', body: JSON.stringify(data) }),
  },
  auth: {
    claim:      (token: string)  => request<{ tenant_id: string; api_key: string }>('/v1/auth/claim', { method: 'POST', body: JSON.stringify({ token }) }),
    magicLink:  (email: string)  => request('/v1/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }) }),
  },
  keys: {
    list:   ()                         => request('/v1/keys'),
    create: (mode: 'live' | 'test')    => request<{ api_key: string; id: string; prefix: string }>('/v1/keys', { method: 'POST', body: JSON.stringify({ mode }) }),
    revoke: (id: string)               => request(`/v1/keys/${id}`, { method: 'DELETE' }),
  },
  applications: {
    submit:  (data: unknown) => request('/v1/applications', { method: 'POST', body: JSON.stringify(data) }),
  },
  adminApplications: {
    list:    ()                                          => adminRequest('/admin/applications'),
    approve: (id: string, nombaSubAccountId: string)    => adminRequest<{ tenantId: string }>(`/admin/applications/${id}/approve`, { method: 'POST', body: JSON.stringify({ nombaSubAccountId }) }),
    reject:  (id: string, reason: string)               => adminRequest(`/admin/applications/${id}/reject`,  { method: 'POST', body: JSON.stringify({ reason }) }),
  },
};
