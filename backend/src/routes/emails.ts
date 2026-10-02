import { Router } from 'express';
import { EmailStatus } from '@prisma/client';
import { z } from 'zod';
import { listEmails } from '../services/emailList';
import { searchEmails } from '../services/searchService';

export const emailsRouter = Router();

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const searchQuery = pageQuery.extend({
  q: z.string().trim().min(1).max(200),
  status: z.nativeEnum(EmailStatus).optional(),
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

emailsRouter.get('/search', async (req, res) => {
  const { q, status, page, limit } = searchQuery.parse(req.query);
  res.json(await searchEmails({ userId: res.locals.userId, q, status, page, limit }));
});