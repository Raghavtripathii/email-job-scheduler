import { randomBytes } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { googleClient } from '../lib/googleClient';
import { clearCookieOptions, COOKIE_NAME, cookieOptions, signSession } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { requireUser } from '../middleware/auth';
import { signInWithEmail } from '../services/passwordAuth';
import { upsertGoogleUser } from '../services/userService';

export const authRouter = Router();

const STATE_COOKIE = 'oauth_state';

// step 1: send the person to google
authRouter.get('/google', (_req, res) => {
  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { ...clearCookieOptions, maxAge: 10 * 60 * 1000 });

  const url = googleClient.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
  res.redirect(url);
});

// step 2: google sends them back here with a one time code
authRouter.get('/google/callback', async (req, res) => {
  const fail = (reason: string) => res.redirect(`${env.FRONTEND_URL}/login?error=${reason}`);
  const { code, state, error } = req.query;

  if (error) return fail('google_denied');
  if (typeof code !== 'string' || typeof state !== 'string') return fail('bad_request');

  // the state must match the one we set, or it's a forged login
  const savedState = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, clearCookieOptions);
  if (!savedState || savedState !== state) return fail('bad_state');

  try {
    const { tokens } = await googleClient.getToken(code);
    if (!tokens.id_token) return fail('no_id_token');

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) return fail('email_not_verified');

    const user = await upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name ?? profile.email,
      avatar: profile.picture,
    });

    res.cookie(COOKIE_NAME, signSession(user.id), cookieOptions);
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('google login failed:', err instanceof Error ? err.message : err);
    fail('login_failed');
  }
});

const emailLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('enter a valid email').max(255),
  password: z.string().min(8, 'use at least 8 characters').max(72, 'use 72 characters or fewer'),
});

// sign up or log in with an email and password
authRouter.post('/email', async (req, res) => {
  const { email, password } = emailLoginSchema.parse(req.body);
  const user = await signInWithEmail(email, password, req.ip ?? 'unknown');

  res.cookie(COOKIE_NAME, signSession(user.id), cookieOptions);
  res.json({ ok: true });
});

// who am i, the sidebar uses this
authRouter.get('/me', requireUser, async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: res.locals.userId },
    select: { id: true, name: true, email: true, avatar: true },
  });

  if (!user) {
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    res.status(401).json({ error: 'please log in' });
    return;
  }
  res.json(user);
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, clearCookieOptions);
  res.json({ ok: true });
});