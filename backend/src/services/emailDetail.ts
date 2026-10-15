import { bodyToHtml, cleanHtml } from '../lib/html';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';

export async function getEmailDetail(userId: string, id: string) {
  const row = await prisma.emailJob.findFirst({
    where: { id, batch: { userId } },
    select: {
      id: true,
      toEmail: true,
      subject: true,
      scheduledAt: true,
      status: true,
      sentAt: true,
      error: true,
      starred: true,
      sender: { select: { name: true, email: true } },
      batch: { select: { body: true } },
    },
  });
  if (!row) throw new HttpError(404, 'email not found');

  const { batch, ...rest } = row;
  // cleaned again on the way out, so the page can show it safely
  return { ...rest, bodyHtml: cleanHtml(bodyToHtml(batch.body)) };
}

export async function setStarred(userId: string, id: string, starred: boolean) {
  const result = await prisma.emailJob.updateMany({
    where: { id, batch: { userId } },
    data: { starred },
  });
  if (result.count === 0) throw new HttpError(404, 'email not found');

  return { starred };
}
