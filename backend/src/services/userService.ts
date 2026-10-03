import { prisma } from '../lib/prisma';

type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  avatar?: string | null;
};

export async function upsertGoogleUser(profile: GoogleProfile) {
  const avatar = profile.avatar ?? null;

  const byGoogle = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
  if (byGoogle) {
    return prisma.user.update({
      where: { id: byGoogle.id },
      data: { name: profile.name, email: profile.email, avatar },
    });
  }

  // an account made with an email and password: google has checked the email,
  // so google takes over and the old password stops working
  const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId: profile.googleId, passwordHash: null, name: profile.name, avatar },
    });
  }

  return prisma.user.create({
    data: { googleId: profile.googleId, name: profile.name, email: profile.email, avatar },
  });
}