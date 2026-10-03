import nodemailer, { type Transporter } from 'nodemailer';
import type { Sender } from '@prisma/client';

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
  const info = await getTransport(args.sender).sendMail({
    from: `"${args.sender.name}" <${args.sender.email}>`,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });

  // ethereal gives a link where you can open the fake email
  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || null };
}