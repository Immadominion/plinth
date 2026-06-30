// Customer test factory — minimal valid Customer with overrides.
import type { Customer } from '../../src/db/customer.repo.js';

let seq = 0;

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  seq += 1;
  return {
    id: `cus_TEST${String(seq).padStart(4, '0')}`,
    tenantId: 'ten_TEST0001',
    externalRef: `ext_${seq}`,
    name: `Test Customer ${seq}`,
    email: `customer${seq}@example.com`,
    phone: null,
    accountBalanceMinor: 0n,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}
