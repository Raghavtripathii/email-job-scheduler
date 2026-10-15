import { redis } from '../lib/redis';

const WINDOW_MS = 60 * 60 * 1000;
const KEY_TTL_SECONDS = 2 * 60 * 60;

// check and count in one step so two workers can't take the same last slot
// returns {1, used} if allowed, or {0, place in line} if the hour is full
const TAKE_SLOT_LUA = `
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if used < tonumber(ARGV[1]) then
  redis.call('INCR', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return {1, used + 1}
end
local place = redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], ARGV[2])
return {0, place}
`;

redis.defineCommand('takeHourlySlot', { numberOfKeys: 2, lua: TAKE_SLOT_LUA });

type RateRedis = typeof redis & {
  takeHourlySlot(usedKey: string, overflowKey: string, limit: number, ttl: number): Promise<[number, number]>;
};
const rateRedis = redis as RateRedis;

// the hour number since 1970, same for every worker
export function windowOf(nowMs: number) {
  return Math.floor(nowMs / WINDOW_MS);
}

export function slotKeys(senderId: string, nowMs: number) {
  const w = windowOf(nowMs);
  return { used: `rate:${senderId}:${w}`, overflow: `overflow:${senderId}:${w}` };
}

export async function takeSlot(senderId: string, limit: number, nowMs = Date.now()) {
  const keys = slotKeys(senderId, nowMs);
  const [ok, position] = await rateRedis.takeHourlySlot(keys.used, keys.overflow, limit, KEY_TTL_SECONDS);
  return { allowed: ok === 1, position };
}

// when an over-limit email should run next, in the order they were pushed
export function nextSlotTime(position: number, limit: number, minDelayMs: number, nowMs = Date.now()) {
  const windowStart = windowOf(nowMs) * WINDOW_MS;
  const hoursAhead = Math.floor((position - 1) / limit) + 1;
  const indexInHour = (position - 1) % limit;
  // keep the whole line inside one hour even with a big limit
  const spacing = Math.min(minDelayMs, Math.floor(WINDOW_MS / limit));
  return windowStart + hoursAhead * WINDOW_MS + indexInHour * spacing;
}
