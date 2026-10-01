import IORedis from 'ioredis';
import { env } from '../config/env';

// bullmq needs maxRetriesPerRequest set to null
export function createRedis() {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export const redis = createRedis();

redis.on('error', (err) => console.error('redis error:', err.message));