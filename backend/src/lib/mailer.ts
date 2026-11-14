import nodemailer, { type Transporter } from 'nodemailer';
import type { Sender } from '@prisma/client';
import { env } from '../config/env';

export type SentMessage = { from: string; to: string; subject: string; html: string; text: string };

// with MAIL_TRANSPORT=memory the emails land here instead of going out, so tests can read them
export const outbox: SentMessage[] = [];

export function clearOutbox() {
  outbox.length = 0;
}

// one smtp connection setup per sender, reused
const transports = new Map<string, Transporter>();

function getTransport(sender: Sender) {
  let transport = transports.get(sender.id);
  if (!transport) {
    transport = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: false,
      auth: { user: sender.smtpUser, pass: sender.smtpPass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    transports.set(sender.id, transport);
  }
  return transport;
}

type SendArgs = { sender: Sender; to: string; subject: string; html: string; text: string };

export async function sendEmail(args: SendArgs) {
  const from = `"${args.sender.name}" <${args.sender.email}>`;

  if (env.MAIL_TRANSPORT === 'memory') {
    outbox.push({ from, to: args.to, subject: args.subject, html: args.html, text: args.text });
    return { messageId: `memory-${outbox.length}`, previewUrl: null };
  }

  const info = await getTransport(args.sender).sendMail({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });

  // ethereal gives a link where you can open the fake email
  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || null };
}