import { DelayedError, Worker, type Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { env } from '../config/env';
import { bodyToHtml, toPlainText } from '../lib/html';
import { prisma } from '../lib/prisma';
import { bullConnection } from '../lib/redis';
import { sendEmail } from '../lib/mailer';
import { EMAIL_QUEUE_NAME, type EmailJobData } from '../queues/names';
import { nextSlotTime, takeSlot } from '../services/rateLimiter';
import { updateEmailDoc } from '../services/searchIndex';
import { notifyRateLimitHit } from '../services/slackNotifier';

async function processEmail(job: Job<EmailJobData>, token?: string) {
  const { emailJobId } = job.data;

  const email = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true, batch: { select: { body: true, hourlyLimit: true, userId: true } } },
  });

  // cheap check first, nothing to do if it was handled already
  if (!email || email.status !== EmailStatus.scheduled) {
    console.log(`skip ${emailJobId}, already taken or gone`);
    return;
  }

  // hourly limit for this sender, counted in redis so every worker agrees
  const now = Date.now();
  const limit = Math.min(email.batch.hourlyLimit, env.MAX_EMAILS_PER_HOUR_PER_SENDER);
  const slot = await takeSlot(email.senderId, limit, now);

  if (!slot.allowed) {
    const runAt = nextSlotTime(slot.position, limit, env.MIN_DELAY_BETWEEN_EMAILS_MS, now);
    const rescheduledAt = new Date(runAt);

    // show the new time in the scheduled list, then push the job back in the queue
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { scheduledAt: rescheduledAt },
    });
    await updateEmailDoc(emailJobId, { scheduledAt: rescheduledAt });
    await job.moveToDelayed(runAt, token);

    if (slot.position === 1) {
      console.log(`hourly limit of ${limit} hit for ${email.sender.email}, pushing the rest to the next hours`);
    }

    // tells the owner on slack, at most once per sender per hour
    await notifyRateLimitHit({
      userId: email.batch.userId,
      senderId: email.senderId,
      senderEmail: email.sender.email,
      limit,
      nowMs: now,
    });

    throw new DelayedError();
  }

  // claim it, only one worker can win this
  const claimed = await prisma.emailJob.updateMany({
    where: { id: emailJobId, status: EmailStatus.scheduled },
    data: { status: EmailStatus.sending, attempts: { increment: 1 } },
  });
  if (claimed.count === 0) {
    console.log(`skip ${emailJobId}, someone else claimed it`);
    return;
  }

  try {
    const html = bodyToHtml(email.batch.body);
    const result = await sendEmail({
      sender: email.sender,
      to: email.toEmail,
      subject: email.subject,
      html,
      text: toPlainText(html),
    });

    const sentAt = new Date();
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: EmailStatus.sent, sentAt, error: null },
    });
    await updateEmailDoc(emailJobId, { status: EmailStatus.sent, sentAt });
    console.log(`sent to ${email.toEmail} via ${email.sender.email} | ${result.previewUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failedAt = new Date();
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: EmailStatus.failed, sentAt: failedAt, error: message.slice(0, 1000) },
    });
    await updateEmailDoc(emailJobId, { status: EmailStatus.failed, sentAt: failedAt });
    // rethrow so the job shows as failed in the queue too
    throw err;
  }
}

export function createEmailWorker() {
  // one send per min delay, shared by every worker on this queue
  const limiter =
    env.MIN_DELAY_BETWEEN_EMAILS_MS > 0
      ? { max: 1, duration: env.MIN_DELAY_BETWEEN_EMAILS_MS }
      : undefined;

  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmail, {
    connection: bullConnection,
    concurrency: env.WORKER_CONCURRENCY,
    limiter,
  });

  worker.on('failed', (job, err) => console.error(`failed ${job?.id}: ${err.message}`));
  worker.on('error', (err) => console.error('worker error:', err.message));

  return worker;
}