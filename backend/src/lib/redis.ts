import IORedis from 'ioredis';
import { env } from '../config/env';

const url = new URL(env.REDIS_URL);

// plain options for bullmq, it builds its own connections from these
export const bullConnection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  username: url.username || undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  tls: url.protocol === 'rediss:' ? {} : undefined,
  maxRetriesPerRequest: null,
};

// bullmq needs maxRetriesPerRequest set to null
export function createRedis() {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export const redis = createRedis();

redis.on('error', (err) => console.error('redis error:', err.message));