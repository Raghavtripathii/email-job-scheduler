import { app } from './app';
import { env } from './config/env';
import { elastic } from './lib/elastic';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { emailQueue } from './queues/emailQueue';
import { reconcile } from './services/reconcile';
import { setupSearch } from './services/searchIndex';
import { syncSenders } from './services/senderService';

async function main() {
  await syncSenders();
  await reconcile().catch((err) => console.error('reconcile failed:', err.message));

  // runs in the background, the api does not wait for elasticsearch
  void setupSearch();

  const server = app.listen(env.PORT, () => {
    console.log(`api listening on http://localhost:${env.PORT}`);
  });

  // close connections nicely when the server stops
  async function shutdown(signal: string) {
    console.log(`${signal} received, shutting down`);
    server.close();
    await emailQueue.close();
    await elastic.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('could not start api:', err.message);
  process.exit(1);
});