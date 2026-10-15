import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { windowOf } from './rateLimiter';

const HOUR_MS = 60 * 60 * 1000;
const KEY_TTL_SECONDS = 2 * 60 * 60;
const RETRY_AFTER_FAIL_SECONDS = 60;

type Args = {
  userId: string;
  senderId: string;
  senderEmail: string;
  limit: number;
  nowMs: number;
};

function buildMessage({ senderEmail, limit, nowMs }: Args) {
  const resumesAtMs = (windowOf(nowMs) + 1) * HOUR_MS;
  const unix = Math.floor(resumesAtMs / 1000);
  // slack shows this in the reader's own time zone
  const when = `<!date^${unix}^{date_short_pretty} at {time}|${new Date(resumesAtMs).toISOString()}>`;

  return `:warning: Hourly limit reached for *${senderEmail}* (${limit} emails per hour). The rest of its emails are paused until ${when}. Nothing is dropped, they will go out then.`;
}

// returns false if slack could not be reached
async function postToSlack(userId: string, webhookUrl: string, text: string) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5000),
  });
  if (res.ok) return true;

  // the webhook was removed in slack, forget it so the dashboard shows disconnected
  if (res.status === 404 || res.status === 410) {
    await prisma.slackConnection.deleteMany({ where: { userId } });
  }
  console.error(`slack answered ${res.status}`);
  return false;
}

// never throws, a broken slack must not break sending emails
export async function notifyRateLimitHit(args: Args) {
  try {
    const key = `slack:notified:${args.userId}:${args.senderId}:${windowOf(args.nowMs)}`;

    // already told them this hour
    if (await redis.exists(key)) return;

    // not connected, so do nothing and leave the key unset
    // connecting later then starts working on the very next hit
    const connection = await prisma.slackConnection.findUnique({ where: { userId: args.userId } });
    if (!connection) return;

    // two workers can get here together, only one wins the key
    const won = await redis.set(key, '1', 'EX', KEY_TTL_SECONDS, 'NX');
    if (won !== 'OK') return;

    const sent = await postToSlack(args.userId, connection.webhookUrl, buildMessage(args));
    if (sent) {
      console.log(`slack notified for ${args.senderEmail}`);
    } else {
      // try again in a minute at most
      await redis.expire(key, RETRY_AFTER_FAIL_SECONDS);
    }
  } catch (err) {
    console.error('slack notify failed:', err instanceof Error ? err.message : err);
  }
}
