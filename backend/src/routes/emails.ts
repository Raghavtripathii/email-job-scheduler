import { Router } from 'express';
import { EmailStatus } from '@prisma/client';
import { z } from 'zod';
import { listEmails } from '../services/emailList';

export const emailsRouter = Router();

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

emailsRouter.get('/scheduled', async (req, res) => {
  const { page, limit } = pageQuery.parse(req.query);
  res.json(
    await listEmails({
      userId: res.locals.userId,
      statuses: [EmailStatus.scheduled, EmailStatus.sending],
      orderBy: { scheduledAt: 'asc' },
      page,
      limit,
    }),
  );
});

// sentAt means "when we tried", so failed ones show up here too
emailsRouter.get('/sent', async (req, res) => {
  const { page, limit } = pageQuery.parse(req.query);
  res.json(
    await listEmails({
      userId: res.locals.userId,
      statuses: [EmailStatus.sent, EmailStatus.failed],
      orderBy: { sentAt: 'desc' },
      page,
      limit,
    }),
  );
});