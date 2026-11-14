import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { windowOf } from '../lib/slotMath';
import { notifyRateLimitHit } from './slackNotifier';

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  set: vi.fn(),
  expire: vi.fn(),
  findUnique: vi.fn(),
  deleteMany: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('../lib/redis', () => ({
  redis: { exists: mocks.exists, set: mocks.set, expire: mocks.expire },
}));

vi.mock('../lib/prisma', () => ({
  prisma: { slackConnection: { findUnique: mocks.findUnique, deleteMany: mocks.deleteMany } },
}));

const NOW = Date.UTC(2026, 9, 3, 11, 33, 0);
const args = {
  userId: 'user-1',
  senderId: 'sender-1',
  senderEmail: 'a@ethereal.email',
  limit: 2,
  nowMs: NOW,
};
const KEY = `slack:notified:user-1:sender-1:${windowOf(NOW)}`;
const connection = { webhookUrl: 'https://hooks.slack.com/services/T000/B000/xxxx', channel: '#general' };

describe('notifyRateLimitHit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exists.mockResolvedValue(0);
    mocks.findUnique.mockResolvedValue(connection);
    mocks.set.mockResolvedValue('OK');
    mocks.expire.mockResolvedValue(1);
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.fetch.mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mocks.fetch);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts to the webhook and keeps the key for two hours', async () => {
    await notifyRateLimitHit(args);

    expect(mocks.set).toHaveBeenCalledWith(KEY, '1', 'EX', 7200, 'NX');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url).toBe(connection.webhookUrl);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).text).toContain('a@ethereal.email');
    expect(mocks.expire).not.toHaveBeenCalled();
  });

  it('does nothing when it already told the user this hour', async () => {
    mocks.exists.mockResolvedValue(1);

    await notifyRateLimitHit(args);

    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('does nothing and leaves the key free when slack is not connected', async () => {
    mocks.findUnique.mockResolvedValue(null);

    await notifyRateLimitHit(args);

    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('lets only one worker send when two arrive together', async () => {
    mocks.set.mockResolvedValue(null);

    await notifyRateLimitHit(args);

    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('allows a retry within a minute when slack answers with an error', async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 500 });

    await notifyRateLimitHit(args);

    expect(mocks.expire).toHaveBeenCalledWith(KEY, 60);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it('forgets the connection when slack says the webhook is gone', async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 404 });

    await notifyRateLimitHit(args);

    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(mocks.expire).toHaveBeenCalledWith(KEY, 60);
  });

  it('allows a retry within a minute when the network call itself fails', async () => {
    mocks.fetch.mockRejectedValue(new Error('network down'));

    await notifyRateLimitHit(args);

    expect(mocks.expire).toHaveBeenCalledWith(KEY, 60);
  });

  it('never throws, even when redis fails', async () => {
    mocks.exists.mockRejectedValue(new Error('redis down'));

    await expect(notifyRateLimitHit(args)).resolves.toBeUndefined();
  });
});