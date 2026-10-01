import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

const sendersSchema = z
  .array(z.object({ name: z.string().min(1), user: z.string().min(1), pass: z.string().min(1) }))
  .min(1);

// copies the senders from .env into the database
export async function syncSenders() {
  if (!env.ETHEREAL_SENDERS) {
    console.warn('no ETHEREAL_SENDERS in .env, scheduling will not work');
    return;
  }

  let list: z.infer<typeof sendersSchema>;
  try {
    list = sendersSchema.parse(JSON.parse(env.ETHEREAL_SENDERS));
  } catch {
    throw new Error('ETHEREAL_SENDERS is not valid json, keep it on one line inside single quotes');
  }

  for (const s of list) {
    await prisma.sender.upsert({
      where: { email: s.user },
      update: { name: s.name, smtpUser: s.user, smtpPass: s.pass },
      create: {
        name: s.name,
        email: s.user,
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: s.user,
        smtpPass: s.pass,
      },
    });
  }

  console.log(`${list.length} senders ready`);
}