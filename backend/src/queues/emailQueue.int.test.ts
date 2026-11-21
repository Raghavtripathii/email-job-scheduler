import { Queue } from 'bullmq';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { bullConnection, redis } from '../lib/redis';
import { flushTestRedis } from '../test-support/redis';
import { emailQueue } from './emailQueue';
import { EMAIL_QUEUE_NAME, SEND_EMAIL_JOB } from './names';

const addJob = (id: string, delay = 60_000) =>
  emailQueue.add(SEND_EMAIL_JOB, { emailJobId: id }, { jobId: id, delay });

describe('the email queue with a real redis', () => {
  beforeEach(async () => {
    await flushTestRedis();
  });

  afterAll(async () => {
    await emailQueue.close();
    await redis.quit();
  });

  it('keeps a job with a delay waiting until its time', async () => {
    const job = await addJob('email-1');

    expect(await job.getState()).toBe('delayed');
    expect(job.opts.delay).toBe(60_000);
    expect(await emailQueue.getJobCounts('delayed', 'waiting', 'active')).toMatchObject({
      delayed: 1,
      waiting: 0,
      active: 0,
    });
  });

  it('ignores a second job with the same id', async () => {
    await addJob('email-1');
    await addJob('email-1');

    expect(await emailQueue.getJobCounts('delayed', 'waiting')).toMatchObject({ delayed: 1, waiting: 0 });
  });

  it('keeps different ids as different jobs', async () => {
    await addJob('email-1');
    await addJob('email-2');

    expect(await emailQueue.getJobCounts('delayed')).toMatchObject({ delayed: 2 });
  });

  it('is still there after the queue object is gone, like after a restart', async () => {
    await addJob('email-1');

    // a new queue object is what a freshly started process would have
    const afterRestart = new Queue(EMAIL_QUEUE_NAME, { connection: bullConnection });
    const job = await afterRestart.getJob('email-1');
    const state = await job?.getState();
    await afterRestart.close();

    expect(job?.data).toEqual({ emailJobId: 'email-1' });
    expect(state).toBe('delayed');
  });
});
