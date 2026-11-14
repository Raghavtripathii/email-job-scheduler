import { describe, expect, it } from 'vitest';
import { WINDOW_MS, nextSlotTime, windowOf } from './slotMath';

// a fixed moment, 3 Oct 2026 at 11:33 UTC
const NOW = Date.UTC(2026, 9, 3, 11, 33, 0);
const THIS_HOUR = Math.floor(NOW / WINDOW_MS) * WINDOW_MS;
const NEXT_HOUR = THIS_HOUR + WINDOW_MS;

describe('windowOf', () => {
  it('gives the same number for the whole hour', () => {
    expect(windowOf(THIS_HOUR)).toBe(windowOf(THIS_HOUR + WINDOW_MS - 1));
  });

  it('moves to the next number on the hour', () => {
    expect(windowOf(NEXT_HOUR)).toBe(windowOf(THIS_HOUR) + 1);
  });
});

describe('nextSlotTime', () => {
  it('puts the first pushed email at the start of the next hour', () => {
    expect(nextSlotTime(1, 100, 2000, NOW)).toBe(NEXT_HOUR);
  });

  it('spaces the line by the minimum delay', () => {
    expect(nextSlotTime(2, 100, 2000, NOW)).toBe(NEXT_HOUR + 2000);
    expect(nextSlotTime(100, 100, 2000, NOW)).toBe(NEXT_HOUR + 99 * 2000);
  });

  it('moves on to the following hour after a full hour of places', () => {
    expect(nextSlotTime(101, 100, 2000, NOW)).toBe(NEXT_HOUR + WINDOW_MS);
    expect(nextSlotTime(201, 100, 2000, NOW)).toBe(NEXT_HOUR + 2 * WINDOW_MS);
  });

  it('keeps all places of one hour inside that hour, even with a huge limit', () => {
    for (const position of [1, 2500, 5000]) {
      const time = nextSlotTime(position, 5000, 2000, NOW);
      expect(time).toBeGreaterThanOrEqual(NEXT_HOUR);
      expect(time).toBeLessThan(NEXT_HOUR + WINDOW_MS);
    }
  });

  it('never puts a later place before an earlier one', () => {
    let last = 0;
    for (let position = 1; position <= 350; position++) {
      const time = nextSlotTime(position, 100, 2000, NOW);
      expect(time).toBeGreaterThanOrEqual(last);
      last = time;
    }
  });

  it('gives the same answer anywhere inside the same hour', () => {
    expect(nextSlotTime(5, 100, 2000, THIS_HOUR)).toBe(nextSlotTime(5, 100, 2000, THIS_HOUR + WINDOW_MS - 1));
  });
});