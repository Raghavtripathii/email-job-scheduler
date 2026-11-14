import { describe, expect, it } from 'vitest';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('uses the message of a normal error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back to the code, then the name, when the message is empty', () => {
    expect(errorMessage(Object.assign(new Error(''), { code: 'ETIMEDOUT' }))).toBe('ETIMEDOUT');
    expect(errorMessage(new Error(''))).toBe('Error');
  });

  it('joins what is inside an AggregateError and drops repeats', () => {
    const error = new AggregateError([
      new Error('connect ECONNREFUSED ::1:9200'),
      new Error('connect ECONNREFUSED 127.0.0.1:9200'),
      new Error('connect ECONNREFUSED 127.0.0.1:9200'),
    ]);
    expect(error.message).toBe('');
    expect(errorMessage(error)).toBe('connect ECONNREFUSED ::1:9200; connect ECONNREFUSED 127.0.0.1:9200');
  });

  it('turns anything else into text', () => {
    expect(errorMessage('plain text')).toBe('plain text');
    expect(errorMessage(42)).toBe('42');
  });
});