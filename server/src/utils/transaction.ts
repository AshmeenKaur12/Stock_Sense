import mongoose, { type ClientSession } from 'mongoose';

export interface TxContext {
  session: ClientSession;
  /** Queue a side effect (socket emit, follow-up job) to run only after a successful commit. */
  afterCommit: (fn: () => void | Promise<void>) => void;
}

/**
 * Runs `work` in a MongoDB transaction with automatic retry on transient errors
 * (driver `withTransaction`). Side effects registered via `afterCommit` run once,
 * after the commit succeeds — never for an aborted attempt.
 */
export async function runInTransaction<T>(work: (ctx: TxContext) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  let effects: (() => void | Promise<void>)[] = [];
  try {
    let result!: T;
    await session.withTransaction(
      async () => {
        effects = []; // reset on retry
        result = await work({ session, afterCommit: (fn) => effects.push(fn) });
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
    );
    for (const fn of effects) await fn();
    return result;
  } finally {
    await session.endSession();
  }
}
