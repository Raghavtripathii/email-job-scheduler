import type { EmailStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

type ListArgs = {
  userId: string;
  statuses: EmailStatus[];
  orderBy: Prisma.EmailJobOrderByWithRelationInput;
  page: number;
  limit: number;
};

// one query used by both the scheduled and the sent lists
export async function listEmails({ userId, statuses, orderBy, page, limit }: ListArgs) {
  const where: Prisma.EmailJobWhereInput = {
    status: { in: statuses },
    batch: { userId },
  };

  const [items, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        toEmail: true,
        subject: true,
        scheduledAt: true,
        status: true,
        sentAt: true,
        error: true,
        sender: { select: { email: true } },
      },
    }),
    prisma.emailJob.count({ where }),
  ]);

  return { items, total, page, limit };
}