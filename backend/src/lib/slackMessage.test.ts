import { describe, expect, it } from 'vitest';
import { buildRateLimitMessage } from './slackMessage';

const NOW = Date.UTC(2026, 9, 3, 11, 33, 0);
const NEXT_HOUR = Date.UTC(2026, 9, 3, 12, 0, 0);

describe('buildRateLimitMessage', () => {
  const message = buildRateLimitMessage({ senderEmail: 'a@ethereal.email', limit: 2, nowMs: NOW });

  it('names the sender and the limit', () => {
    expect(message).toContain('*a@ethereal.email*');
    expect(message).toContain('2 emails per hour');
  });

  it('says when the emails resume, in slack date format', () => {
    expect(message).toContain(`<!date^${NEXT_HOUR / 1000}^`);
    expect(message).toContain('|2026-10-03T12:00:00.000Z>');
  });
});