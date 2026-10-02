import { env } from '../config/env';
import { signSession } from '../lib/jwt';
import { prisma } from '../lib/prisma';

// prints a login cookie for the newest real user, only for testing from powershell
async function main() {
  if (env.NODE_ENV === 'production') throw new Error('not for production');

  const user = await prisma.user.findFirst({
    where: { googleId: { not: 'dev-user' } },
    orderBy: { createdAt: 'desc' },
  });
  if (!user) throw new Error('log in with google in the browser once first');

  console.log(`session=${signSession(user.id)}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());