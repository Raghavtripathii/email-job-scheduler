// the hourly windows as plain math, nothing here talks to redis so it is easy to test
export const WINDOW_MS = 60 * 60 * 1000;

// the hour number since 1970, same for every worker
export function windowOf(nowMs: number) {
  return Math.floor(nowMs / WINDOW_MS);
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