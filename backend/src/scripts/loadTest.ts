import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { redis } from '../lib/redis';
import { nextSlotTime, slotKeys, takeSlot, windowOf } from '../services/rateLimiter';

const TOTAL = 1000;
const SENDERS = 3;
const LIMIT = 100;
const HOUR_MS = 60 * 60 * 1000;

async function main() {
  const runId = randomUUID().slice(0, 8);
  const senderIds = Array.from({ length: SENDERS }, (_, i) => `loadtest-${runId}-${i}`);

  // one clock value so every call lands in the same hour
  const now = Date.now();
  const windowStart = windowOf(now) * HOUR_MS;

  console.log(`${TOTAL} emails due at once, ${SENDERS} senders, ${LIMIT} per sender per hour\n`);

  // everything fires at the same time, like 1000 jobs due together
  const results = await Promise.all(
    Array.from({ length: TOTAL }, async (_, i) => {
      const sender = senderIds[i % SENDERS];
      return { sender, ...(await takeSlot(sender, LIMIT, now)) };
    }),
  );

  let allGood = true;
  let totalSent = 0;
  let totalPushed = 0;

  for (const [n, id] of senderIds.entries()) {
    const mine = results.filter((r) => r.sender === id);
    const sentNow = mine.filter((r) => r.allowed);
    const places = mine
      .filter((r) => !r.allowed)
      .map((r) => r.position)
      .sort((a, b) => a - b);

    // every place in line used exactly once, no gaps and no repeats
    const noGaps = places.every((place, idx) => place === idx + 1);

    const times = places.map((p) => nextSlotTime(p, LIMIT, env.MIN_DELAY_BETWEEN_EMAILS_MS, now));
    const inOrder = times.every((t, i) => i === 0 || t >= times[i - 1]);

    const perHour = new Map<number, number>();
    for (const t of times) {
      const ahead = Math.floor((t - windowStart) / HOUR_MS);
      perHour.set(ahead, (perHour.get(ahead) ?? 0) + 1);
    }
    const spread = [...perHour.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([h, c]) => `+${h}h: ${c}`)
      .join(', ');

    const ok = sentNow.length === LIMIT && noGaps && inOrder;
    allGood = allGood && ok;
    totalSent += sentNow.length;
    totalPushed += places.length;

    console.log(
      `sender ${n + 1}: send now ${sentNow.length}, pushed ${places.length} (${spread}) ${ok ? 'ok' : 'PROBLEM'}`,
    );
  }

  const nothingLost = totalSent + totalPushed === TOTAL;
  console.log(`\ntotal: ${totalSent} now + ${totalPushed} pushed = ${totalSent + totalPushed} of ${TOTAL}`);
  console.log(allGood && nothingLost ? 'PASS: limit held, nothing dropped, order kept' : 'FAIL');

  // clean up the test keys
  const keys = senderIds.flatMap((id) => {
    const k = slotKeys(id, now);
    return [k.used, k.overflow];
  });
  await redis.del(...keys);
  await redis.quit();
  process.exit(allGood && nothingLost ? 0 : 1);
}

main().catch((err) => {
  console.error('load test failed:', err.message);
  process.exit(1);
});