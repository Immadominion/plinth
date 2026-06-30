import type { Kobo } from './money.js';

export type LedgerEntryType =
  | 'payment_received'
  | 'overpayment_credit'
  | 'downgrade_credit'
  | 'applied_to_invoice'
  | 'underpayment_shortfall'
  | 'invoice_owed'
  | 'debt_settled'
  | 'refund'
  | 'manual_adjustment';

export interface LedgerEntry {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceId: string | null;
  type: LedgerEntryType;
  amountMinor: Kobo;
  balanceAfterMinor: Kobo;
  description: string;
  createdAt: Date;
}
