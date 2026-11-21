import type { Worker } from 'bullmq';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { clearOutbox, outbox } from '../lib/mailer';
import { WINDOW_MS } from '../lib/slotMath';
import { emailQueue } from '../queues/emailQueue';
import { SEND_EMAIL_JOB } from '../queues/names';
import { scheduleBatch, type ScheduleInput } from '../services/scheduleService';
import { closeConnections } from '../test-support/close';
import { makeSenders, makeUser, resetDatabase } from '../test-support/db';
import { flushTestRedis } from '../test-support/redis';
import { waitFor } from '../test-support/waitFor';
import { createEmailWorker } from './emailWorker';

const mocks = vi.hoisted(() => ({ failFor: new Set<string>() }));

// elasticsearch is not part of these tests
vi.mock('../services/searchIndex', () => ({
  indexScheduledEmails: vi.fn(),
  toEmailDoc: vi.fn(),
  updateEmailDoc: vi.fn(),
}));

// the memory mailer, except that chosen addresses are refused like a broken smtp login would
vi.mock('../lib/mailer', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/mailer')>();
  return {
    ...original,
    sendEmail: async (args: Parameters<typeof original.sendEmail>[0]) => {
      if (mocks.failFor.has(args.to)) throw new Error('Invalid login: 535 Authentication failed');
      return original.sendEmail(args);
    },
  };
});

const countWithStatus = (status: 'scheduled' | 'sending' | 'sent' | 'failed') =>
  prisma.emailJob.count({ where: { status } });

describe('the email worker with a real mysql and redis', () => {
  let userId: string;
  let senders: Awaited<ReturnType<typeof makeSenders>>;
  let workers: Worker[] = [];

  const schedule = (emails: string[], overrides: Partial<ScheduleInput> = {}) =>
    scheduleBatch({
      userId,
      subject: 'Hello',
      body: '<p>Hi there</p>',
      emails,
      startTime: new Date(),
      delayMs: 0,
      hourlyLimit: 100,
      ...overrides,
    });

  const addresses = (count: number) => Array.from({ length: count }, (_, i) => `person${i + 1}@example.com`);

  const startWorkers = (count = 1) => {
    for (let i = 0; i < count; i++) workers.push(createEmailWorker());
  };

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await flushTestRedis();
    await resetDatabase();
    clearOutbox();
    mocks.failFor.clear();
    userId = (await makeUser()).id;
    senders = await makeSenders(3);
  });

  afterEach(async () => {
    await Promise.all(workers.map((worker) => worker.close()));
    workers = [];
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await closeConnections();
  });

  it('sends every email exactly once', async () => {
    const recipients = addresses(6);
    await schedule(recipients);

    startWorkers();
    await waitFor(async () => (await countWithStatus('sent')) === 6);

    expect(outbox.map((message) => message.to).sort()).toEqual(recipients);
    expect(outbox[0].html).toContain('Hi there');

    const rows = await prisma.emailJob.findMany();
    expect(rows.every((row) => row.attempts === 1 && row.sentAt !== null && row.error === null)).toBe(true);
  });

  it('never sends the same email twice when two workers run together', async () => {
    const recipients = addresses(30);
    await schedule(recipients);

    startWorkers(2);
    await waitFor(async () => (await countWithStatus('sent')) === 30);

    expect(outbox).toHaveLength(30);
    expect(outbox.map((message) => message.to).sort()).toEqual([...recipients].sort());
  });

  it('does not send again when the same job shows up again', async () => {
    await schedule(addresses(3));
    startWorkers();
    // the jobs finish a moment after their rows say sent, and a running job cannot be removed
    await waitFor(async () => (await emailQueue.getJobCounts('completed')).completed === 3);

    // like reconcile putting a job back after it was removed
    const [row] = await prisma.emailJob.findMany();
    await (await emailQueue.getJob(row.id))?.remove();
    await emailQueue.add(SEND_EMAIL_JOB, { emailJobId: row.id }, { jobId: row.id });
    await waitFor(async () => (await (await emailQueue.getJob(row.id))?.isCompleted()) === true);

    expect(outbox).toHaveLength(3);
    expect(await prisma.emailJob.findUniqueOrThrow({ where: { id: row.id } })).toMatchObject({ attempts: 1 });
  });

  it('marks only the refused email as failed, the others still go out', async () => {
    mocks.failFor.add('person2@example.com');
    await schedule(addresses(3));

    startWorkers();
    await waitFor(async () => (await countWithStatus('sent')) + (await countWithStatus('failed')) === 3);

    expect(outbox.map((message) => message.to).sort()).toEqual([
      'person1@example.com',
      'person3@example.com',
    ]);
    const failed = await prisma.emailJob.findFirstOrThrow({ where: { status: 'failed' } });
    expect(failed.toEmail).toBe('person2@example.com');
    expect(failed.error).toContain('535');
  });

  it('pushes emails over the hourly limit to later hours instead of sending them', async () => {
    await schedule(addresses(5), { senderId: senders[0].id, hourlyLimit: 2 });
    const before = Date.now();

    startWorkers();
    await waitFor(async () => (await countWithStatus('sent')) === 2);
    await waitFor(async () => (await emailQueue.getJobCounts('delayed')).delayed === 3);

    expect(outbox).toHaveLength(2);
    const pushed = await prisma.emailJob.findMany({ where: { status: 'scheduled' } });
    expect(pushed).toHaveLength(3);
    for (const row of pushed) {
      expect(row.scheduledAt.getTime()).toBeGreaterThan(before);
      expect(row.scheduledAt.getTime()).toBeLessThanOrEqual(before + 3 * WINDOW_MS);
    }
  });
});
