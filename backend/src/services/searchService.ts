import type { EmailStatus } from '@prisma/client';
import { elastic, EMAIL_INDEX } from '../lib/elastic';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';
import { emailSelect, toListItem } from './emailList';

// elasticsearch does not allow paging deeper than this by default
const MAX_WINDOW = 10_000;

type SearchArgs = {
  userId: string;
  q: string;
  status?: EmailStatus;
  page: number;
  limit: number;
};

export async function searchEmails({ userId, q, status, page, limit }: SearchArgs) {
  if (page * limit > MAX_WINDOW) {
    throw new HttpError(400, 'too many pages, make the search more specific');
  }

  // only ever search this person's own emails
  const filter: object[] = [{ term: { userId } }];
  if (status) filter.push({ term: { status } });

  let result;
  try {
    result = await elastic.search({
      index: EMAIL_INDEX,
      from: (page - 1) * limit,
      size: limit,
      track_total_hits: true,
      _source: false,
      query: {
        bool: {
          filter,
          must: [
            {
              // bool_prefix lets "slack" find "slack3@example.com"
              multi_match: {
                query: q,
                type: 'bool_prefix',
                operator: 'and',
                fields: ['toEmail^3', 'subject^2', 'senderEmail', 'body'],
              },
            },
          ],
        },
      },
      sort: [{ _score: { order: 'desc' } }, { scheduledAt: { order: 'desc' } }],
    });
  } catch {
    throw new HttpError(503, 'search is not available right now');
  }

  const ids = result.hits.hits.map((hit) => hit._id).filter((id): id is string => Boolean(id));
  const total = typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total?.value ?? 0);

  // show the real current data from mysql, in the order elasticsearch ranked it
  const rows = await prisma.emailJob.findMany({
    where: { id: { in: ids }, batch: { userId } },
    select: emailSelect,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map(toListItem);

  return { items, total, page, limit };
}
