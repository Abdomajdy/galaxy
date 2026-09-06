import { describe, it, expect } from 'vitest';
import { generatePassportKey, hashPassportKey, extractBearerToken } from './passport';

describe('generatePassportKey', () => {
  it('follows the gx_<handle>_<8chars> format', () => {
    const key = generatePassportKey('sophie');
    expect(key).toMatch(/^gx_sophie_[a-z0-9]{8}$/);
  });

  it('produces different keys on each call for the same handle', () => {
    const a = generatePassportKey('sophie');
    const b = generatePassportKey('sophie');
    expect(a).not.toBe(b);
  });
});

describe('hashPassportKey', () => {
  it('produces a deterministic sha256 hex string', () => {
    const h1 = hashPassportKey('gx_sophie_abcdefgh');
    const h2 = hashPassportKey('gx_sophie_abcdefgh');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashPassportKey('gx_a_11111111')).not.toBe(hashPassportKey('gx_a_22222222'));
  });
});

describe('extractBearerToken', () => {
  it('extracts the token from a well-formed header', () => {
    expect(extractBearerToken('Bearer gx_sophie_abcdefgh')).toBe('gx_sophie_abcdefgh');
  });

  it('returns null for missing or malformed headers', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('gx_sophie_abcdefgh')).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
  });
});
