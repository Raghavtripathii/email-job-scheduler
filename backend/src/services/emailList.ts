import type { EmailStatus, Prisma } from '@prisma/client';
import { bodyToHtml, toPlainText } from '../lib/html';
import { prisma } from '../lib/prisma';

// the same fields are used by the lists and by search results
export const emailSelect = {
  id: true,
  toEmail: true,
  subject: true,
  scheduledAt: true,
  status: true,
  sentAt: true,
  error: true,
  starred: true,
  sender: { select: { email: true } },
  batch: { select: { body: true } },
} satisfies Prisma.EmailJobSelect;

type EmailRow = Prisma.EmailJobGetPayload<{ select: typeof emailSelect }>;

// the list shows a short preview of the body, never the whole thing
export function toListItem(row: EmailRow) {
  const { batch, ...rest } = row;
  const snippet = toPlainText(bodyToHtml(batch.body)).replace(/\s+/g, ' ').slice(0, 140);
  return { ...rest, snippet };
}

type ListArgs = {
  userId: string;
  statuses: EmailStatus[];
  status?: EmailStatus;
  orderBy: Prisma.EmailJobOrderByWithRelationInput;
  page: number;
  limit: number;
};

// one query used by both the scheduled and the sent lists
export async function listEmails({ userId, statuses, status, orderBy, page, limit }: ListArgs) {
  // the filter can only narrow the tab, never leave it
  const wanted = status && statuses.includes(status) ? [status] : statuses;
  const where: Prisma.EmailJobWhereInput = {
    status: { in: wanted },
    batch: { userId },
  };

  const [rows, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: emailSelect,
    }),
    prisma.emailJob.count({ where }),
  ]);

  return { items: rows.map(toListItem), total, page, limit };
}