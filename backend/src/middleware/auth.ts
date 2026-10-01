import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// temporary, phase 4 swaps this for the real google login check
export async function requireUser(_req: Request, res: Response, next: NextFunction) {
  const user = await prisma.user.upsert({
    where: { googleId: 'dev-user' },
    update: {},
    create: { googleId: 'dev-user', name: 'Dev User', email: 'dev@local.test' },
  });

  res.locals.userId = user.id;
  next();
}