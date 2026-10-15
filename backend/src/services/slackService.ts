import { env } from '../config/env';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';

type SlackAccessResponse = {
  ok: boolean;
  error?: string;
  team?: { name?: string };
  incoming_webhook?: { url?: string; channel?: string };
};

// the three slack values must be in .env for connect to work
function getConfig() {
  const { SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URL } = env;
  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_REDIRECT_URL) {
    throw new HttpError(503, 'slack is not set up on this server, check the SLACK values in .env');
  }
  return { clientId: SLACK_CLIENT_ID, clientSecret: SLACK_CLIENT_SECRET, redirectUrl: SLACK_REDIRECT_URL };
}

export function buildAuthorizeUrl(state: string) {
  const { clientId, redirectUrl } = getConfig();
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'incoming-webhook');
  url.searchParams.set('redirect_uri', redirectUrl);
  url.searchParams.set('state', state);
  return url.toString();
}

// swaps the one time code for the webhook of the channel the person picked
export async function exchangeCode(code: string) {
  const { clientId, clientSecret, redirectUrl } = getConfig();

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUrl,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const data = (await res.json()) as SlackAccessResponse;
  if (!data.ok || !data.incoming_webhook?.url) {
    throw new Error(`slack oauth failed: ${data.error ?? 'no webhook returned'}`);
  }

  return {
    webhookUrl: data.incoming_webhook.url,
    channel: data.incoming_webhook.channel ?? null,
    teamName: data.team?.name ?? null,
  };
}

type ConnectionInfo = { webhookUrl: string; channel: string | null; teamName: string | null };

// connecting again just replaces the old webhook
export function saveConnection(userId: string, info: ConnectionInfo) {
  return prisma.slackConnection.upsert({
    where: { userId },
    update: info,
    create: { userId, ...info },
  });
}

// never send the webhook url to the browser, it works like a password
export async function getStatus(userId: string) {
  const connection = await prisma.slackConnection.findUnique({
    where: { userId },
    select: { channel: true, teamName: true },
  });
  return connection ? { connected: true, ...connection } : { connected: false };
}

export function removeConnection(userId: string) {
  return prisma.slackConnection.deleteMany({ where: { userId } });
}
