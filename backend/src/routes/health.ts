import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export const healthRouter = Router();

// a dead service shouldn't hang the check forever
function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

healthRouter.get('/', async (_req, res) => {
  const [db, cache] = await Promise.allSettled([
    withTimeout(prisma.$queryRaw`SELECT 1`),
    withTimeout(redis.ping()),
  ]);

  const dbUp = db.status === 'fulfilled';
  const redisUp = cache.status === 'fulfilled';
  const allUp = dbUp && redisUp;

  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    redis: redisUp ? 'up' : 'down',
  });
});
