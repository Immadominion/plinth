// Named fixture cast. Used across integration tests for readable, stable test narratives.
// Bob = individual developer, Acme = mid-size business, Adashe = cooperative savings group.

export const FIXTURES = {
  tenants: {
    bob: { name: 'Bob Dev Studio', mode: 'test' as const },
    acme: { name: 'Acme Corp', mode: 'live' as const },
    adashe: { name: 'Adashe Coop', mode: 'test' as const },
  },
  clock: {
    /** 30 days in seconds — typical subscription period advance */
    thirtyDays: 30 * 24 * 60 * 60,
    /** 1 day — small increment for dunning step tests */
    oneDay: 24 * 60 * 60,
  },
} as const;
