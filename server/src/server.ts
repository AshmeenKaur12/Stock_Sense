import http from 'node:http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { startJobs, stopJobs } from './services/jobs.service';
import { closeSocket, initSocket } from './sockets';

async function bootstrap() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  startJobs();

  server.listen(env.PORT, () => {
    logger.info(`StockSense API ready → http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down…`);
    stopJobs();
    server.close();
    await closeSocket();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.fatal(err instanceof Error ? err.message : err);
  process.exit(1);
});
