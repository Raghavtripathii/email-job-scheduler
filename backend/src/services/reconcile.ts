import { EmailStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { emailQueue } from '../queues/emailQueue';
import { SEND_EMAIL_JOB } from '../queues/names';

// a real send ends well before this (smtp timeouts are shorter)
const STUCK_AFTER_MS = 60 * 1000;
const CHUNK = 100;

const LIVE_STATES = new Set(['delayed', 'waiting', 'active', 'prioritized', 'waiting-children']);

// safe to run many times and from both the api and the worker
export async function reconcile() {
  // 1. rows that were mid-send when something died
  const stuck = await prisma.emailJob.updateMany({
    where: {
      status: EmailStatus.sending,
      updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
    },
    data: {
      status: EmailStatus.failed,
      sentAt: new Date(),
      error: 'stopped mid-send, not retried so it cannot go out twice',
    },
  });

  // 2. scheduled rows that have no live job in redis
  const rows = await prisma.emailJob.findMany({
    where: { status: EmailStatus.scheduled },
    select: { id: true, scheduledAt: true },
  });

  let restored = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const results = await Promise.all(
      rows.slice(i, i + CHUNK).map(async (row) => {
        const existing = await emailQueue.getJob(row.id);
        if (existing) {
          const state = await existing.getState();
          if (LIVE_STATES.has(state)) return false;
          // dead leftover with the same id would block the new one
          await existing.remove().catch(() => {});
        }

        await emailQueue.add(
          SEND_EMAIL_JOB,
          { emailJobId: row.id },
          { jobId: row.id, delay: Math.max(0, row.scheduledAt.getTime() - Date.now()) },
        );
        return true;
      }),
    );
    restored += results.filter(Boolean).length;
  }

  console.log(
    `reconcile: ${rows.length} scheduled in db, ${restored} jobs restored, ${stuck.count} stuck marked failed`,
  );
}
