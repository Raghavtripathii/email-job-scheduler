import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { WINDOW_MS } from '../lib/slotMath';
import { emailQueue } from '../queues/emailQueue';
import { closeConnections } from '../test-support/close';
import { makeSenders, makeUser, resetDatabase } from '../test-support/db';
import { flushTestRedis } from '../test-support/redis';
import { scheduleBatch, type ScheduleInput } from './scheduleService';

// elasticsearch is not part of these tests
vi.mock('./searchIndex', () => ({
  indexScheduledEmails: vi.fn(),
  toEmailDoc: vi.fn(),
  updateEmailDoc: vi.fn(),
}));

const MINUTE = 60 * 1000;

describe('scheduleBatch with a real mysql and redis', () => {
  let userId: string;
  let senders: Awaited<ReturnType<typeof makeSenders>>;

  const schedule = (overrides: Partial<ScheduleInput> = {}) =>
    scheduleBatch({
      userId,
      subject: 'Hello',
      body: '<p>Hi there</p>',
      emails: ['a@example.com', 'b@example.com', 'c@example.com'],
      startTime: new Date(Date.now() + 10 * MINUTE),
      delayMs: 5000,
      hourlyLimit: 100,
      ...overrides,
    });

  beforeEach(async () => {
    await flushTestRedis();
    await resetDatabase();
    userId = (await makeUser()).id;
    senders = await makeSenders(3);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeConnections();
  });

  it('saves the batch, one row per email and one delayed job per email', async () => {
    const startTime = new Date(Date.now() + 10 * MINUTE);

    const result = await schedule({ startTime });

    expect(result.total).toBe(3);
    expect(await prisma.batch.count()).toBe(1);

    const rows = await prisma.emailJob.findMany({ orderBy: { scheduledAt: 'asc' } });
    expect(rows.map((row) => row.toEmail)).toEqual(['a@example.com', 'b@example.com', 'c@example.com']);
    expect(rows.map((row) => row.status)).toEqual(['scheduled', 'scheduled', 'scheduled']);
    expect(rows.map((row) => row.scheduledAt.getTime())).toEqual([
      startTime.getTime(),
      startTime.getTime() + 5000,
      startTime.getTime() + 10_000,
    ]);

    expect(await emailQueue.getJobCounts('delayed', 'waiting')).toMatchObject({ delayed: 3, waiting: 0 });
    for (const row of rows) {
      const job = await emailQueue.getJob(row.id);
      expect(job?.data).toEqual({ emailJobId: row.id });
    }
  });

  it('shares the emails between all senders in turns', async () => {
    await schedule({ emails: ['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com', 'e@x.com', 'f@x.com'] });

    const rows = await prisma.emailJob.findMany({ orderBy: { scheduledAt: 'asc' } });
    const [first, second, third] = senders.map((sender) => sender.id);
    expect(rows.map((row) => row.senderId)).toEqual([first, second, third, first, second, third]);
  });

  it('uses only the chosen sender', async () => {
    await schedule({ senderId: senders[1].id });

    const rows = await prisma.emailJob.findMany();
    expect(new Set(rows.map((row) => row.senderId))).toEqual(new Set([senders[1].id]));
  });

  it('sends one email to an address that is listed twice', async () => {
    const result = await schedule({ emails: ['a@x.com', 'b@x.com', 'a@x.com'] });

    expect(result.total).toBe(2);
    expect(result.duplicatesRemoved).toBe(1);
    expect(await prisma.emailJob.count()).toBe(2);
  });

  it('cleans the body before it is saved', async () => {
    await schedule({ body: '<p>Hello</p><script>alert(1)</script><img src=x onerror=alert(2)>' });

    const batch = await prisma.batch.findFirstOrThrow();
    expect(batch.body).toContain('Hello');
    expect(batch.body).not.toContain('script');
    expect(batch.body).not.toContain('onerror');
  });

  it('treats a start time in the past as now', async () => {
    const before = Date.now();

    await schedule({ startTime: new Date(before - 60 * MINUTE), emails: ['a@x.com'] });

    const row = await prisma.emailJob.findFirstOrThrow();
    expect(row.scheduledAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(row.scheduledAt.getTime()).toBeLessThan(before + MINUTE);
    // no delay means it can be picked up right away
    expect(await emailQueue.getJobCounts('delayed', 'waiting')).toMatchObject({ delayed: 0, waiting: 1 });
  });

  describe('refuses bad input and leaves nothing behind', () => {
    const nothingSaved = async () => {
      expect(await prisma.batch.count()).toBe(0);
      expect(await prisma.emailJob.count()).toBe(0);
      expect(await emailQueue.getJobCounts('delayed', 'waiting')).toMatchObject({ delayed: 0, waiting: 0 });
    };

    it('an empty body', async () => {
      await expect(schedule({ body: '<p> </p>' })).rejects.toMatchObject({
        status: 400,
        message: 'the email body is empty',
      });
      await nothingSaved();
    });

    it('a sender that does not exist', async () => {
      await expect(schedule({ senderId: 'nobody' })).rejects.toMatchObject({ status: 400 });
      await nothingSaved();
    });

    it('a schedule that runs more than 30 days ahead', async () => {
      await expect(schedule({ delayMs: 20 * 24 * 60 * MINUTE })).rejects.toMatchObject({ status: 400 });
      await nothingSaved();
    });

    it('no senders at all', async () => {
      await prisma.sender.deleteMany();

      await expect(schedule()).rejects.toMatchObject({ status: 503 });
      await nothingSaved();
    });
  });

  it('removes the batch again when redis fails', async () => {
    vi.spyOn(emailQueue, 'addBulk').mockRejectedValueOnce(new Error('redis down'));

    await expect(schedule()).rejects.toThrow('redis down');

    expect(await prisma.batch.count()).toBe(0);
    expect(await prisma.emailJob.count()).toBe(0);
  });

  it('spaces the emails by the delay', async () => {
    const result = await schedule({ delayMs: WINDOW_MS, emails: ['a@x.com', 'b@x.com'] });

    expect(result.lastSendAt.getTime() - result.firstSendAt.getTime()).toBe(WINDOW_MS);
  });
});
