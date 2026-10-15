import { elastic } from '../lib/elastic';
import { prisma } from '../lib/prisma';
import { ensureIndex, reindexAll } from '../services/searchIndex';

// rebuilds the search index from mysql, run it after elasticsearch was down
async function main() {
  await ensureIndex();
  const total = await reindexAll();
  console.log(`reindexed ${total} emails`);
}

void main()
  .catch((err) => {
    console.error('reindex failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await elastic.close();
    await prisma.$disconnect();
  });