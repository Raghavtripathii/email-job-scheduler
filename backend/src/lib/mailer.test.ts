import type { Sender } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearOutbox, outbox, sendEmail } from './mailer';

const sender = { id: 'sender-1', name: 'Sender 1', email: 'one@ethereal.email' } as Sender;

describe('memory mail transport', () => {
  beforeEach(() => {
    clearOutbox();
  });

  it('keeps the email in the outbox instead of sending it', async () => {
    await sendEmail({ sender, to: 'a@example.com', subject: 'Hi', html: '<b>hello</b>', text: 'hello' });

    expect(outbox).toEqual([
      {
        from: '"Sender 1" <one@ethereal.email>',
        to: 'a@example.com',
        subject: 'Hi',
        html: '<b>hello</b>',
        text: 'hello',
      },
    ]);
  });

  it('answers like a real send, with no preview link', async () => {
    const first = await sendEmail({ sender, to: 'a@example.com', subject: 'x', html: 'x', text: 'x' });
    const second = await sendEmail({ sender, to: 'b@example.com', subject: 'x', html: 'x', text: 'x' });

    expect(first.previewUrl).toBeNull();
    expect(first.messageId).not.toBe(second.messageId);
  });

  it('can be emptied between tests', async () => {
    await sendEmail({ sender, to: 'a@example.com', subject: 'x', html: 'x', text: 'x' });
    clearOutbox();
    expect(outbox).toHaveLength(0);
  });
});