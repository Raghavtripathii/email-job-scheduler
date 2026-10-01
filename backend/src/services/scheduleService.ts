import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { emailQueue } from '../queues/emailQueue';
import { SEND_EMAIL_JOB } from '../queues/names';

const MAX_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;
const CHUNK = 500;

export type ScheduleInput = {
  userId: string;
  subject: string;
  body: string;
  emails: string[];
  startTime: Date;
  delayMs: number;
  hourlyLimit: number;
};

export async function scheduleBatch(input: ScheduleInput) {
  const senders = await prisma.sender.findMany({ orderBy: { email: 'asc' } });
  if (senders.length === 0) {
    throw new HttpError(503, 'no senders set up, check ETHEREAL_SENDERS in .env');
  }

  // same address twice gets one email
  const emails = [...new Set(input.emails)];
  const duplicatesRemoved = input.emails.length - emails.length;

  // a start time in the past just means start now
  const now = Date.now();
  const startMs = Math.max(input.startTime.getTime(), now);
  const lastMs = startMs + (emails.length - 1) * input.delayMs;
  if (lastMs - now > MAX_AHEAD_MS) {
    throw new HttpError(400, 'schedule runs more than 30 days ahead, shorten the delay or the list');
  }

  // ids made here so the db and the queue use the same one
  const batchId = randomUUID();
  const rows = emails.map((toEmail, i) => ({
    id: randomUUID(),
    batchId,
    senderId: senders[i % senders.length].id,
    toEmail,
    subject: input.subject,
    scheduledAt: new Date(startMs + i * input.delayMs),
  }));

  // batch and emails go in together or not at all
  await prisma.$transaction([
    prisma.batch.create({
      data: {
        id: batchId,
        userId: input.userId,
        subject: input.subject,
        body: input.body,
        startTime: new Date(startMs),
        delayMs: input.delayMs,
        hourlyLimit: input.hourlyLimit,
      },
    }),
    prisma.emailJob.createMany({ data: rows }),
  ]);

  try {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const jobs = rows.slice(i, i + CHUNK).map((row) => ({
        name: SEND_EMAIL_JOB,
        data: { emailJobId: row.id },
        opts: { jobId: row.id, delay: Math.max(0, row.scheduledAt.getTime() - Date.now()) },
      }));
      await emailQueue.addBulk(jobs);
    }
  } catch (err) {
    // redis failed, remove the rows (any stray jobs get skipped by the worker)
    await prisma.batch.delete({ where: { id: batchId } }).catch(() => {});
    throw err;
  }

  return {
    batchId,
    total: rows.length,
    duplicatesRemoved,
    senders: senders.length,
    hourlyLimit: input.hourlyLimit,
    firstSendAt: rows[0].scheduledAt,
    lastSendAt: rows[rows.length - 1].scheduledAt,
  };
}