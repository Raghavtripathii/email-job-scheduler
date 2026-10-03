import { compare, hash } from 'bcryptjs';
import { HttpError } from '../lib/httpError';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const MAX_FAILS = 8;
const FAIL_WINDOW_SECONDS = 15 * 60;
const BCRYPT_ROUNDS = 12;

const failKey = (ip: string, email: string) => `login:fail:${ip}:${email}`;

// a new email creates the account, a known email checks the password
export async function signInWithEmail(email: string, password: string, ip: string) {
  const key = failKey(ip, email);

  const fails = Number(await redis.get(key)) || 0;
  if (fails >= MAX_FAILS) {
    throw new HttpError(429, 'too many tries, wait 15 minutes and try again');
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    return prisma.user.create({ data: { email, name: email.split('@')[0], passwordHash } });
  }

  // a google only account has no password, so it fails like a wrong password
  const ok = existing.passwordHash ? await compare(password, existing.passwordHash) : false;
  if (!ok) {
    await redis.multi().incr(key).expire(key, FAIL_WINDOW_SECONDS).exec();
    // same message either way, so nobody can find out which emails exist
    throw new HttpError(401, 'wrong email or password, or this email uses Google login');
  }

  await redis.del(key);
  return existing;
}