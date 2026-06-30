// In-memory UnitOfWork for service unit tests. run() just invokes the callback with a
// dummy TxContext — there is no real transaction; the in-memory repos ignore the tx.
// This lets us test orchestration (lock → compute → append → update) with zero I/O.
import type { UnitOfWork, TxContext } from '../../src/db/unit-of-work.js';

const FAKE_TX = {} as TxContext;

export class FakeUnitOfWork implements UnitOfWork {
  async run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T> {
    return fn(FAKE_TX);
  }
}
