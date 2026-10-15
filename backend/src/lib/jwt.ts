import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const COOKIE_NAME = 'session';

const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: SEVEN_DAYS_S });
}

// returns the user id, or null if the token is fake or expired
export function readSession(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export const clearCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export const cookieOptions = { ...clearCookieOptions, maxAge: SEVEN_DAYS_S * 1000 };
