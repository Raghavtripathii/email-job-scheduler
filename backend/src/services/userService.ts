import { prisma } from '../lib/prisma';

type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  avatar?: string | null;
};

// first login creates the user, later logins refresh name and photo
export function upsertGoogleUser(profile: GoogleProfile) {
  return prisma.user.upsert({
    where: { googleId: profile.googleId },
    update: { name: profile.name, email: profile.email, avatar: profile.avatar ?? null },
    create: {
      googleId: profile.googleId,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar ?? null,
    },
  });
}