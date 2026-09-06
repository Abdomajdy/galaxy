import { describe, it, expect } from 'vitest';
import {
  generateHandshakeCode,
  hashHandshakeCode,
  isWellFormedHandshakeCode,
  HANDSHAKE_TTL_MS,
} from './index';

describe('generateHandshakeCode', () => {
  it('produces a mnemonic of form WORD-NNN', () => {
    const code = generateHandshakeCode();
    expect(code).toMatch(/^[A-Z]{4,8}-[A-Z0-9]{3}$/);
  });

  it('is different on consecutive calls', () => {
    const a = generateHandshakeCode();
    const b = generateHandshakeCode();
    expect(a).not.toBe(b);
  });
});

describe('hashHandshakeCode', () => {
  it('produces a deterministic sha256 hex string', () => {
    const h1 = hashHandshakeCode('ORION-4A7');
    const h2 = hashHandshakeCode('ORION-4A7');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is case-insensitive', () => {
    expect(hashHandshakeCode('orion-4a7')).toBe(hashHandshakeCode('ORION-4A7'));
  });

  it('produces different hashes for different codes', () => {
    expect(hashHandshakeCode('ORION-4A7')).not.toBe(hashHandshakeCode('LYRA-9X2'));
  });
});

describe('isWellFormedHandshakeCode', () => {
  it('accepts canonical and lowercase forms', () => {
    expect(isWellFormedHandshakeCode('ORION-4A7')).toBe(true);
    expect(isWellFormedHandshakeCode('orion-4a7')).toBe(true);
  });

  it('rejects malformed codes', () => {
    expect(isWellFormedHandshakeCode('')).toBe(false);
    expect(isWellFormedHandshakeCode('ORION')).toBe(false);
    expect(isWellFormedHandshakeCode('ORION-')).toBe(false);
    expect(isWellFormedHandshakeCode('ORION-4A')).toBe(false);
    expect(isWellFormedHandshakeCode('OR-4A7')).toBe(false);
    expect(isWellFormedHandshakeCode('ORION-4A7X')).toBe(false);
  });
});

describe('HANDSHAKE_TTL_MS', () => {
  it('is a sensible short window (1–60 minutes)', () => {
    expect(HANDSHAKE_TTL_MS).toBeGreaterThanOrEqual(60_000);
    expect(HANDSHAKE_TTL_MS).toBeLessThanOrEqual(60 * 60_000);
  });
});
