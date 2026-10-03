import { Router } from 'express';
import { EmailStatus } from '@prisma/client';
import { z } from 'zod';
import { getEmailDetail, setStarred } from '../services/emailDetail';
import { listEmails } from '../services/emailList';
import { searchEmails } from '../services/searchService';

export const emailsRouter = Router();

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const listQuery = pageQuery.extend({
  status: z.nativeEnum(EmailStatus).optional(),
});

const searchQuery = listQuery.extend({
  q: z.string().trim().min(1).max(200),
});

const idParams = z.object({ id: z.string().min(1).max(64) });

emailsRouter.get('/scheduled', async (req, res) => {
  const { page, limit, status } = listQuery.parse(req.query);
  res.json(
    await listEmails({
      userId: res.locals.userId,
      statuses: [EmailStatus.scheduled, EmailStatus.sending],
      status,
      orderBy: { scheduledAt: 'asc' },
      page,
      limit,
    }),
  );
});

// sentAt means "when we tried", so failed ones show up here too
emailsRouter.get('/sent', async (req, res) => {
  const { page, limit, status } = listQuery.parse(req.query);
  res.json(
    await listEmails({
      userId: res.locals.userId,
      statuses: [EmailStatus.sent, EmailStatus.failed],
      status,
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

// these two must stay below the fixed paths above
emailsRouter.get('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(await getEmailDetail(res.locals.userId, id));
});

emailsRouter.patch('/:id/star', async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { starred } = z.object({ starred: z.boolean() }).parse(req.body);
  res.json(await setStarred(res.locals.userId, id, starred));
});