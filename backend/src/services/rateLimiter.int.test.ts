import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { redis } from '../lib/redis';
import { WINDOW_MS, nextSlotTime } from '../lib/slotMath';
import { flushTestRedis } from '../test-support/redis';
import { slotKeys, takeSlot } from './rateLimiter';

const NOW = Date.UTC(2026, 9, 3, 11, 33, 0);
const THIS_HOUR = Math.floor(NOW / WINDOW_MS) * WINDOW_MS;

const ascending = (a: number, b: number) => a - b;
const oneTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

// a fresh copy of the module has its own redis connection, like a separate worker process
async function freshInstance() {
  vi.resetModules();
  const [limiter, connection] = await Promise.all([import('./rateLimiter.js'), import('../lib/redis.js')]);
  return { takeSlot: limiter.takeSlot, close: () => connection.redis.quit() };
}

describe('takeSlot with a real redis', () => {
  beforeEach(async () => {
    await flushTestRedis();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('allows calls up to the limit, then hands out places in line', async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await takeSlot('sender-1', 3, NOW));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results.map((r) => r.position)).toEqual([1, 2, 3, 1, 2]);
  });

  it('never lets parallel calls take the same slot', async () => {
    const results = await Promise.all(Array.from({ length: 200 }, () => takeSlot('sender-1', 50, NOW)));

    const allowed = results.filter((r) => r.allowed);
    const pushed = results.filter((r) => !r.allowed);

    expect(allowed).toHaveLength(50);
    expect(pushed).toHaveLength(150);
    // every call got its own number, so nothing was counted twice or skipped
    expect(allowed.map((r) => r.position).sort(ascending)).toEqual(oneTo(50));
    expect(pushed.map((r) => r.position).sort(ascending)).toEqual(oneTo(150));
  });

  it('holds the limit when several workers with their own connections call together', async () => {
    const workers = [await freshInstance(), await freshInstance(), await freshInstance()];

    const results = await Promise.all(
      Array.from({ length: 300 }, (_, i) => workers[i % workers.length].takeSlot('sender-1', 100, NOW)),
    );
    await Promise.all(workers.map((worker) => worker.close()));

    const allowed = results.filter((r) => r.allowed);
    const pushed = results.filter((r) => !r.allowed);
    expect(allowed).toHaveLength(100);
    expect(pushed).toHaveLength(200);
    expect(pushed.map((r) => r.position).sort(ascending)).toEqual(oneTo(200));
  });

  it('counts every sender on its own', async () => {
    await takeSlot('sender-1', 1, NOW);
    const second = await takeSlot('sender-1', 1, NOW);
    const other = await takeSlot('sender-2', 1, NOW);

    expect(second.allowed).toBe(false);
    expect(other.allowed).toBe(true);
  });

  it('starts fresh in the next hour', async () => {
    await takeSlot('sender-1', 1, NOW);

    const sameHour = await takeSlot('sender-1', 1, NOW + 60_000);
    const nextHour = await takeSlot('sender-1', 1, THIS_HOUR + WINDOW_MS);

    expect(sameHour.allowed).toBe(false);
    expect(nextHour.allowed).toBe(true);
  });

  it('lets the counters expire by themselves', async () => {
    await takeSlot('sender-1', 1, NOW);
    await takeSlot('sender-1', 1, NOW);
    const keys = slotKeys('sender-1', NOW);

    for (const key of [keys.used, keys.overflow]) {
      const seconds = await redis.ttl(key);
      expect(seconds).toBeGreaterThan(0);
      expect(seconds).toBeLessThanOrEqual(2 * 60 * 60);
    }
  });

  it('gives pushed emails later hours in the order they were pushed', async () => {
    const pushed = [];
    for (let i = 0; i < 10; i++) {
      const slot = await takeSlot('sender-1', 2, NOW);
      if (!slot.allowed) pushed.push(slot.position);
    }

    const times = pushed.map((position) => nextSlotTime(position, 2, 2000, NOW));
    const hoursAhead = times.map((time) => Math.floor((time - THIS_HOUR) / WINDOW_MS));

    expect(times).toEqual([...times].sort(ascending));
    expect(hoursAhead).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
