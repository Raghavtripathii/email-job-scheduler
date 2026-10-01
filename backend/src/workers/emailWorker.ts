import { Worker, type Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { bullConnection } from '../lib/redis';
import { sendEmail } from '../lib/mailer';
import { EMAIL_QUEUE_NAME, type EmailJobData } from '../queues/names';

async function processEmail(job: Job<EmailJobData>) {
  const { emailJobId } = job.data;

  // claim first, only one worker can win this
  const claimed = await prisma.emailJob.updateMany({
    where: { id: emailJobId, status: EmailStatus.scheduled },
    data: { status: EmailStatus.sending, attempts: { increment: 1 } },
  });
  if (claimed.count === 0) {
    console.log(`skip ${emailJobId}, already taken or gone`);
    return;
  }

  const email = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { sender: true, batch: { select: { body: true } } },
  });
  if (!email) return;

  try {
    const result = await sendEmail({
      sender: email.sender,
      to: email.toEmail,
      subject: email.subject,
      text: email.batch.body,
    });

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: EmailStatus.sent, sentAt: new Date(), error: null },
    });
    console.log(`sent to ${email.toEmail} via ${email.sender.email} | ${result.previewUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: EmailStatus.failed, sentAt: new Date(), error: message.slice(0, 1000) },
    });
    // rethrow so the job shows as failed in the queue too
    throw err;
  }
}

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmail, {
    connection: bullConnection,
    concurrency: env.WORKER_CONCURRENCY,
  });

  worker.on('failed', (job, err) => console.error(`failed ${job?.id}: ${err.message}`));
  worker.on('error', (err) => console.error('worker error:', err.message));

  return worker;
}