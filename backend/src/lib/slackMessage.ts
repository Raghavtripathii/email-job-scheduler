import { WINDOW_MS, windowOf } from './slotMath';

type Args = {
  senderEmail: string;
  limit: number;
  nowMs: number;
};

export function buildRateLimitMessage({ senderEmail, limit, nowMs }: Args) {
  const resumesAtMs = (windowOf(nowMs) + 1) * WINDOW_MS;
  const unix = Math.floor(resumesAtMs / 1000);
  // slack shows this in the reader's own time zone
  const when = `<!date^${unix}^{date_short_pretty} at {time}|${new Date(resumesAtMs).toISOString()}>`;

  return `:warning: Hourly limit reached for *${senderEmail}* (${limit} emails per hour). The rest of its emails are paused until ${when}. Nothing is dropped, they will go out then.`;
}