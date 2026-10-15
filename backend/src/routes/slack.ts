import { randomBytes } from 'crypto';
import { Router } from 'express';
import { env } from '../config/env';
import { redis } from '../lib/redis';
import { requireUser } from '../middleware/auth';
import {
  buildAuthorizeUrl,
  exchangeCode,
  getStatus,
  removeConnection,
  saveConnection,
} from '../services/slackService';

export const slackRouter = Router();

const stateKey = (state: string) => `slack:state:${state}`;

// step 1: remember who is connecting, then send them to slack
slackRouter.get('/connect', requireUser, async (_req, res) => {
  const state = randomBytes(16).toString('hex');
  const url = buildAuthorizeUrl(state);

  await redis.set(stateKey(state), res.locals.userId, 'EX', 10 * 60);
  res.redirect(url);
});

// step 2: slack sends them back here (through ngrok), so no login cookie is available
slackRouter.get('/callback', async (req, res) => {
  const back = (result: string) => res.redirect(`${env.FRONTEND_URL}/dashboard?slack=${result}`);
  const { code, state, error } = req.query;

  if (error) return back('denied');
  if (typeof code !== 'string' || typeof state !== 'string') return back('error');

  // the state is single use and tells us which user this is
  const userId = await redis.get(stateKey(state));
  if (!userId) return back('error');
  await redis.del(stateKey(state));

  try {
    const info = await exchangeCode(code);
    await saveConnection(userId, info);
    back('connected');
  } catch (err) {
    console.error('slack connect failed:', err instanceof Error ? err.message : err);
    back('error');
  }
});

slackRouter.get('/status', requireUser, async (_req, res) => {
  res.json(await getStatus(res.locals.userId));
});

slackRouter.delete('/disconnect', requireUser, async (_req, res) => {
  await removeConnection(res.locals.userId);
  res.json({ ok: true });
});
