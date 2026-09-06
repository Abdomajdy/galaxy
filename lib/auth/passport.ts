import { createHash, randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { unauthorized, forbidden } from '@/lib/errors';
import { rowToAgent, type Agent, type AgentRow } from '@/lib/types';

const PASSPORT_PREFIX = 'gx_';

export function generatePassportKey(handle: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i] % alphabet.length];
  return `${PASSPORT_PREFIX}${handle}_${suffix}`;
}

export function hashPassportKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/.exec(header);
  return m ? m[1].trim() : null;
}

export async function requirePassport(req: NextRequest): Promise<Agent> {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token || !token.startsWith(PASSPORT_PREFIX)) {
    throw unauthorized('Missing or malformed Authorization header.');
  }
  const hash = hashPassportKey(token);
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('passport_hash', hash)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw forbidden('Passport key does not match any agent.');
  return rowToAgent(data as AgentRow);
}
