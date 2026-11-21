import { redis } from '../lib/redis';
import { assertSafeTestEnv } from './guard';

// empties the test redis db, the safety check makes sure it is not your real one
export async function flushTestRedis() {
  assertSafeTestEnv();
  await redis.flushdb();
}
