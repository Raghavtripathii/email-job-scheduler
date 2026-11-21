import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { emailQueue } from '../queues/emailQueue';
import { SEND_EMAIL_JOB } from '../queues/names';
import { closeConnections } from '../test-support/close';
import { makeEmails, makeSenders, makeUser, resetDatabase } from '../test-support/db';
import { flushTestRedis } from '../test-support/redis';
import { reconcile } from './reconcile';

const MINUTE = 60 * 1000;

describe('reconcile with a real mysql and redis', () => {
  let userId: string;
  let senderId: string;

  const makeRows = (recipients: string[]) =>
    makeEmails({ userId, senderId, recipients, scheduledAt: new Date(Date.now() + 10 * MINUTE) });

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await flushTestRedis();
    await resetDatabase();
    userId = (await makeUser()).id;
    senderId = (await makeSenders(1))[0].id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeConnections();
  });

  it('puts back a job that is missing in redis', async () => {
    const [row] = await makeRows(['a@example.com']);

    await reconcile();

    const job = await emailQueue.getJob(row.id);
    expect(job?.data).toEqual({ emailJobId: row.id });
    expect(await job?.getState()).toBe('delayed');
  });

  it('restores the delay from the time saved in the database', async () => {
    const [row] = await makeRows(['a@example.com']);

    await reconcile();

    const job = await emailQueue.getJob(row.id);
    const delay = job?.opts.delay ?? 0;
    expect(delay).toBeGreaterThan(9 * MINUTE);
    expect(delay).toBeLessThanOrEqual(10 * MINUTE);
  });

  it('leaves a job alone that is still alive', async () => {
    const [row] = await makeRows(['a@example.com']);
    const original = await emailQueue.add(
      SEND_EMAIL_JOB,
      { emailJobId: row.id },
      { jobId: row.id, delay: 10 * MINUTE },
    );

    await reconcile();

    const job = await emailQueue.getJob(row.id);
    expect(job?.timestamp).toBe(original.timestamp);
    expect(await emailQueue.getJobCounts('delayed')).toMatchObject({ delayed: 1 });
  });

  it('is safe to run twice', async () => {
    await makeRows(['a@example.com', 'b@example.com', 'c@example.com']);

    await reconcile();
    await reconcile();

    expect(await emailQueue.getJobCounts('delayed', 'waiting')).toMatchObject({ delayed: 3, waiting: 0 });
  });

  it('does not queue emails that are already sent', async () => {
    const [row] = await makeRows(['a@example.com']);
    await prisma.emailJob.update({ where: { id: row.id }, data: { status: 'sent', sentAt: new Date() } });

    await reconcile();

    expect(await emailQueue.getJob(row.id)).toBeUndefined();
  });

  it('marks an email stuck in sending as failed and never queues it again', async () => {
    const [row] = await makeRows(['a@example.com']);
    await prisma.emailJob.update({ where: { id: row.id }, data: { status: 'sending' } });
    // pretend it started five minutes ago
    await prisma.$executeRaw`UPDATE EmailJob SET updatedAt = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 5 MINUTE) WHERE id = ${row.id}`;

    await reconcile();

    const after = await prisma.emailJob.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.status).toBe('failed');
    expect(after.error).toContain('stopped mid-send');
    expect(await emailQueue.getJob(row.id)).toBeUndefined();
  });

  it('does not touch an email that started sending a moment ago', async () => {
    const [row] = await makeRows(['a@example.com']);
    await prisma.emailJob.update({ where: { id: row.id }, data: { status: 'sending' } });

    await reconcile();

    const after = await prisma.emailJob.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.status).toBe('sending');
  });
});
