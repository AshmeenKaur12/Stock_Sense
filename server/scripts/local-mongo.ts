/**
 * Starts a persistent single-node MongoDB replica set on 127.0.0.1:27018 without Docker.
 * The mongod binary is provided by mongodb-memory-server (downloaded once and cached),
 * data lives in <repo>/.mongo-data so it survives restarts.
 *
 *   npm run db            → start (Ctrl+C to stop)
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoBinary } from 'mongodb-memory-server';

const PORT = Number(process.env.LOCAL_MONGO_PORT ?? 27018);
const HOST = `127.0.0.1:${PORT}`;
const REPL_SET = 'rs0';
const DATA_DIR = path.resolve(__dirname, '..', '..', '.mongo-data');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForPrimary(): Promise<void> {
  const client = new mongoose.mongo.MongoClient(`mongodb://${HOST}/?directConnection=true`, {
    serverSelectionTimeoutMS: 1500,
  });

  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await client.connect();
      const admin = client.db('admin');
      try {
        await admin.command({ replSetGetStatus: 1 });
      } catch (err) {
        if ((err as { code?: number }).code === 94) {
          console.log('› Initialising replica set rs0…');
          await admin.command({ replSetInitiate: { _id: REPL_SET, members: [{ _id: 0, host: HOST }] } });
        } else {
          throw err;
        }
      }
      const hello = (await admin.command({ hello: 1 })) as { isWritablePrimary?: boolean };
      if (hello.isWritablePrimary) {
        await client.close();
        return;
      }
    } catch {
      // mongod still booting — retry
    }
    await sleep(1000);
  }
  await client.close();
  throw new Error('Timed out waiting for the replica set to become primary');
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log('› Resolving mongod binary (first run downloads it, ~70 MB)…');
  const bin = await MongoBinary.getPath();

  const mongod = spawn(bin, ['--replSet', REPL_SET, '--port', String(PORT), '--bind_ip', '127.0.0.1', '--dbpath', DATA_DIR], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  mongod.stderr.on('data', (d: Buffer) => process.stderr.write(d));
  mongod.on('exit', (code) => {
    console.log(`› mongod exited (code ${code})`);
    process.exit(code ?? 0);
  });

  const stop = () => {
    console.log('\n› Stopping mongod…');
    mongod.kill('SIGINT');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  await waitForPrimary();
  console.log(`✔ MongoDB replica set "${REPL_SET}" ready → mongodb://${HOST}/stocksense?directConnection=true`);
  console.log(`  data dir: ${DATA_DIR}`);
}

main().catch((err) => {
  console.error('✖', err instanceof Error ? err.message : err);
  process.exit(1);
});
