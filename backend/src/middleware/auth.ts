import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAME, readSession } from '../lib/jwt';

// no valid wristband, no entry
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  const userId = typeof token === 'string' ? readSession(token) : null;

  if (!userId) {
    res.status(401).json({ error: 'please log in' });
    return;
  }

  res.locals.userId = userId;
  next();
}