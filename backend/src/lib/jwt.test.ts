import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { clearCookieOptions, cookieOptions, readSession, signSession } from './jwt';

const secret = process.env.JWT_SECRET as string;

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('session tokens', () => {
  it('gives back the user id that was signed', () => {
    expect(readSession(signSession('user-1'))).toBe('user-1');
  });

  it('refuses a token whose body was changed', () => {
    const [header, , signature] = signSession('user-1').split('.');
    const forged = [header, encode({ sub: 'admin' }), signature].join('.');
    expect(readSession(forged)).toBeNull();
  });

  it('refuses a token signed with another secret', () => {
    const token = jwt.sign({ sub: 'user-1' }, 'another-secret-another-secret-123456');
    expect(readSession(token)).toBeNull();
  });

  it('refuses an expired token', () => {
    const token = jwt.sign({ sub: 'user-1' }, secret, { expiresIn: -10 });
    expect(readSession(token)).toBeNull();
  });

  it('refuses a token with no signature at all (alg none)', () => {
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: 'user-1' })}.`;
    expect(readSession(token)).toBeNull();
  });

  it('refuses another signing algorithm even with the right secret', () => {
    const token = jwt.sign({ sub: 'user-1' }, secret, { algorithm: 'HS512' });
    expect(readSession(token)).toBeNull();
  });

  it('refuses a token without a user id', () => {
    expect(readSession(jwt.sign({ other: 1 }, secret))).toBeNull();
  });

  it('refuses text that is not a token', () => {
    expect(readSession('not-a-token')).toBeNull();
    expect(readSession('')).toBeNull();
  });
});

describe('cookie options', () => {
  it('hides the cookie from scripts and from other sites', () => {
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe('lax');
    expect(cookieOptions.path).toBe('/');
  });

  it('lasts seven days and is only secure in production', () => {
    expect(cookieOptions.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    expect(cookieOptions.secure).toBe(false);
  });

  it('has no max age when clearing', () => {
    expect('maxAge' in clearCookieOptions).toBe(false);
  });
});