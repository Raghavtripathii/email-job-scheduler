import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { emailQueue } from '../queues/emailQueue';

// every test file opens its own connections, close them or vitest never exits
export async function closeConnections() {
  await emailQueue.close();
  await redis.quit();
  await prisma.$disconnect();
}
