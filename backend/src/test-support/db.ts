import { EmailStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { assertSafeTestEnv } from './guard';

// empties the test database, children first because of the foreign keys
export async function resetDatabase() {
  assertSafeTestEnv();
  await prisma.emailJob.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.slackConnection.deleteMany();
  await prisma.sender.deleteMany();
  await prisma.user.deleteMany();
}

export function makeUser(email = 'owner@example.com') {
  return prisma.user.create({ data: { name: 'Owner', email } });
}

// sender1@..., sender2@..., the same order the app sorts them in
export async function makeSenders(count: number) {
  const senders = [];
  for (let i = 1; i <= count; i++) {
    const email = `sender${i}@ethereal.email`;
    senders.push(
      await prisma.sender.create({
        data: {
          name: `Sender ${i}`,
          email,
          smtpHost: 'smtp.ethereal.email',
          smtpUser: email,
          smtpPass: 'not-a-real-password',
        },
      }),
    );
  }
  return senders;
}

type EmailsInput = { userId: string; senderId: string; recipients: string[]; scheduledAt: Date };

// rows straight in the database, with nothing in the queue
export async function makeEmails({ userId, senderId, recipients, scheduledAt }: EmailsInput) {
  const batch = await prisma.batch.create({
    data: {
      userId,
      subject: 'Hello',
      body: '<p>Hi there</p>',
      startTime: scheduledAt,
      delayMs: 0,
      hourlyLimit: 100,
    },
  });
  await prisma.emailJob.createMany({
    data: recipients.map((toEmail) => ({
      batchId: batch.id,
      senderId,
      toEmail,
      subject: 'Hello',
      scheduledAt,
      status: EmailStatus.scheduled,
    })),
  });
  return prisma.emailJob.findMany({ where: { batchId: batch.id }, orderBy: { toEmail: 'asc' } });
}
