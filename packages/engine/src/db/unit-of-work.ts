import { db } from './client.js';

/** Opaque transaction handle. Nothing outside db/ can construct one. */
export type TxContext = { readonly _txContextBrand: never };

export interface UnitOfWork {
  run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>;
}

export type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function asTxContext(tx: DrizzleTx): TxContext {
  return tx as unknown as TxContext;
}

export function fromTxContext(tx: TxContext): DrizzleTx {
  return tx as unknown as DrizzleTx;
}

export class DrizzleUnitOfWork implements UnitOfWork {
  async run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
    return db.transaction((dTx) => fn(asTxContext(dTx)));
  }
}
