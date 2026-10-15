import type { EmailStatus } from '@prisma/client';
import { elastic, EMAIL_INDEX } from '../lib/elastic';
import { toPlainText } from '../lib/html';
import { prisma } from '../lib/prisma';

const MAX_BODY_CHARS = 2000;
const BACKFILL_CHUNK = 500;

export type EmailDoc = {
  userId: string;
  batchId: string;
  toEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: EmailStatus;
  scheduledAt: Date;
  sentAt: Date | null;
};

type RowForIndex = {
  id: string;
  batchId: string;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  sender: { email: string };
  batch: { userId: string; body: string };
};

export function toEmailDoc(row: RowForIndex): EmailDoc {
  return {
    userId: row.batch.userId,
    batchId: row.batchId,
    toEmail: row.toEmail,
    subject: row.subject,
    // the body is html, search only needs the words
    body: toPlainText(row.batch.body).slice(0, MAX_BODY_CHARS),
    senderEmail: row.sender.email,
    status: row.status,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
  };
}

// returns true when the index had to be created
export async function ensureIndex() {
  if (await elastic.indices.exists({ index: EMAIL_INDEX })) return false;

  await elastic.indices.create({
    index: EMAIL_INDEX,
    mappings: {
      properties: {
        userId: { type: 'keyword' },
        batchId: { type: 'keyword' },
        toEmail: { type: 'text' },
        subject: { type: 'text' },
        body: { type: 'text' },
        senderEmail: { type: 'text' },
        status: { type: 'keyword' },
        scheduledAt: { type: 'date' },
        sentAt: { type: 'date' },
      },
    },
  });
  return true;
}

async function bulkIndex(docs: { id: string; doc: EmailDoc }[]) {
  if (docs.length === 0) return;

  const operations = docs.flatMap(({ id, doc }) => [{ index: { _index: EMAIL_INDEX, _id: id } }, doc]);
  const result = await elastic.bulk({ operations });
  if (result.errors) console.error('elasticsearch: some emails were not indexed');
}

// copies every email from mysql into the index, mysql is the source of truth
export async function reindexAll() {
  let total = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.emailJob.findMany({
      take: BACKFILL_CHUNK,
      orderBy: { id: 'asc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { email: true } },
        batch: { select: { userId: true, body: true } },
      },
    });
    if (rows.length === 0) break;

    await bulkIndex(rows.map((row) => ({ id: row.id, doc: toEmailDoc(row) })));
    total += rows.length;
    cursor = rows[rows.length - 1].id;
  }

  return total;
}

let ready = false;

// makes sure the index exists with the right mapping before any write
async function ensureReady() {
  if (ready) return;

  const created = await ensureIndex();
  ready = true;
  if (created) {
    const total = await reindexAll();
    console.log(`elasticsearch: index created, ${total} emails indexed`);
  }
}

// search is a bonus, so a failure here only logs and never throws
async function safely(what: string, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (err) {
    const status = (err as { meta?: { statusCode?: number } }).meta?.statusCode;
    // a missing document is normal when the index was just rebuilt
    if (status === 404) return;
    console.error(`elasticsearch ${what} failed:`, err instanceof Error ? err.message : err);
  }
}

export function setupSearch() {
  return safely('setup', async () => {
    await ensureReady();
    console.log('elasticsearch: index ready');
  });
}

export function indexScheduledEmails(docs: { id: string; doc: EmailDoc }[]) {
  return safely('indexing', async () => {
    await ensureReady();
    await bulkIndex(docs);
  });
}

export function updateEmailDoc(id: string, changes: Partial<EmailDoc>) {
  return safely('update', async () => {
    await ensureReady();
    await elastic.update({ index: EMAIL_INDEX, id, doc: changes });
  });
}
