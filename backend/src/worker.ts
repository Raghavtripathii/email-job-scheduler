import { env } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { createEmailWorker } from './workers/emailWorker';

const worker = createEmailWorker();
console.log(`worker running, concurrency ${env.WORKER_CONCURRENCY}`);

// let running jobs finish before we quit
async function shutdown(signal: string) {
  console.log(`${signal} received, waiting for running jobs`);
  await worker.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));