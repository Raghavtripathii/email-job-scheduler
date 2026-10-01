import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { scheduleBatch } from '../services/scheduleService';

export const scheduleRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

const scheduleSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(20000),
  emails: z.array(z.string().trim().toLowerCase().email()).min(1).max(5000),
  startTime: z.coerce.date(),
  delayMs: z.coerce.number().int().min(0).max(DAY_MS),
  hourlyLimit: z.coerce.number().int().min(1).max(env.MAX_EMAILS_PER_HOUR_PER_SENDER),
});

scheduleRouter.post('/', async (req, res) => {
  const input = scheduleSchema.parse(req.body);
  const result = await scheduleBatch({ ...input, userId: res.locals.userId });
  res.status(201).json(result);
});