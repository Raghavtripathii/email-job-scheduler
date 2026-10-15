import { env } from '../config/env';
import { signSession } from '../lib/jwt';
import { prisma } from '../lib/prisma';

// prints a login cookie for the newest real user, only for testing from powershell
async function main() {
  if (env.NODE_ENV === 'production') throw new Error('not for production');

  // password accounts have no googleId, so they count as real users too
  const user = await prisma.user.findFirst({
    where: { OR: [{ googleId: null }, { googleId: { not: 'dev-user' } }] },
    orderBy: { createdAt: 'desc' },
  });
  if (!user) throw new Error('log in once in the browser first');

  console.log(`session=${signSession(user.id)}`);
}

void main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
