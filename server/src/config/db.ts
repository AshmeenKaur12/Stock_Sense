import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

const MAX_ATTEMPTS = 15;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Connects to MongoDB, retrying while the database boots (e.g. `npm run dev:local`
 * starts the DB and API in parallel). Refuses to run against a standalone server
 * because every stock-changing operation relies on multi-document transactions.
 */
export async function connectDB(uri: string = env.MONGO_URI): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      break;
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
      logger.warn(`MongoDB not reachable (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s…`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  await assertReplicaSet();
  logger.info(`MongoDB connected → ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
  return mongoose;
}

/**
 * A mongod started with --replSet but not yet through `rs.initiate()` also reports
 * no `setName` — indistinguishable at a glance from a real standalone server. That
 * happens for a few seconds during `npm run dev:local`, since the API and the local
 * replica set boot in parallel. So this retries for a while before giving up, rather
 * than failing fast on what is usually just a startup race.
 */
async function assertReplicaSet(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB connection has no database handle');
    const hello = (await db.admin().command({ hello: 1 })) as { setName?: string };
    if (hello.setName) return;

    if (attempt >= MAX_ATTEMPTS) {
      await mongoose.disconnect();
      throw new Error(
        'MongoDB is running as a standalone server, but StockSense requires a replica set for transactions.\n' +
          '  → Run `npm run db` (local replica set on :27018) or `docker compose up -d`, then point MONGO_URI at it.',
      );
    }
    logger.warn(`MongoDB replica set not yet initialized (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s…`);
    await sleep(RETRY_DELAY_MS);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
