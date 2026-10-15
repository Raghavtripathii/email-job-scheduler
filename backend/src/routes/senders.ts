import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const sendersRouter = Router();

// only the safe fields, the smtp password never leaves the server
sendersRouter.get('/', async (_req, res) => {
  res.json(
    await prisma.sender.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { email: 'asc' },
    }),
  );
});
