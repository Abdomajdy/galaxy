import { createHash, randomBytes } from 'node:crypto';

export const HANDSHAKE_TTL_MS = 10 * 60_000; // 10 minutes

const CONSTELLATIONS = [
  'ORION', 'LYRA', 'VELA', 'CORVUS', 'DRACO', 'PAVO', 'CETUS', 'CARINA',
  'HYDRA', 'CYGNUS', 'AURIGA', 'PICTOR', 'PHOENIX', 'VIRGO', 'LEPUS',
  'SERPENS', 'PERSEUS', 'ARIES', 'TAURUS', 'LYNX', 'TUCANA', 'MENSA',
  'CRATER', 'LIBRA', 'FORNAX', 'INDUS', 'GEMINI', 'CRUX', 'CAELUM', 'NORMA',
];

const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

const CODE_RE = /^[A-Z]{4,8}-[A-Z0-9]{3}$/;

export function generateHandshakeCode(): string {
  const bytes = randomBytes(4);
  const word = CONSTELLATIONS[bytes[0] % CONSTELLATIONS.length];
  let suffix = '';
  for (let i = 1; i <= 3; i++) {
    suffix += SUFFIX_ALPHABET[bytes[i] % SUFFIX_ALPHABET.length];
  }
  return `${word}-${suffix}`;
}

export function hashHandshakeCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function isWellFormedHandshakeCode(code: string): boolean {
  return CODE_RE.test(code.trim().toUpperCase());
}

export function handshakeExpiryFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + HANDSHAKE_TTL_MS);
}
