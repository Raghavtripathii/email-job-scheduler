import { env } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { emailQueue } from './queues/emailQueue';
import { reconcile } from './services/reconcile';
import { createEmailWorker } from './workers/emailWorker';

async function main() {
  // fix any gap between mysql and redis before taking jobs
  await reconcile().catch((err) => console.error('reconcile failed:', err.message));

  const worker = createEmailWorker();
  console.log(
    `worker running, concurrency ${env.WORKER_CONCURRENCY}, min delay ${env.MIN_DELAY_BETWEEN_EMAILS_MS}ms`,
  );

  // let running jobs finish before we quit
  async function shutdown(signal: string) {
    console.log(`${signal} received, waiting for running jobs`);
    await worker.close();
    await emailQueue.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('could not start worker:', err.message);
  process.exit(1);
});