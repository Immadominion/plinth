import { StateTransitionError, InvoiceFinalizedError } from '../errors.js';

export type InvoiceState = 'draft' | 'open' | 'partially_paid' | 'paid' | 'uncollectible' | 'void';
export type BillingMode = 'advance' | 'arrears';

const LEGAL: Record<InvoiceState, InvoiceState[]> = {
  draft:          ['open', 'void'],
  open:           ['partially_paid', 'paid', 'uncollectible', 'void'],
  partially_paid: ['paid', 'uncollectible', 'void'],
  paid:           [],
  uncollectible:  ['paid'],
  void:           [],
};

export function assertInvoiceTransition(from: InvoiceState, to: InvoiceState): void {
  if (!LEGAL[from].includes(to)) {
    throw new StateTransitionError(`invoice:${from}`, `invoice:${to}`);
  }
}

export function assertInvoiceMutable(state: InvoiceState): void {
  if (state !== 'draft') {
    throw new InvoiceFinalizedError(state);
  }
}
