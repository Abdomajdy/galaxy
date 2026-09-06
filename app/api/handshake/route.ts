import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse } from '@/lib/errors';
import {
  generateHandshakeCode,
  hashHandshakeCode,
  handshakeExpiryFromNow,
  HANDSHAKE_TTL_MS,
} from '@/lib/handshake';

export async function POST(req: NextRequest) {
  try {
    const agent = await requirePassport(req);

    const code = generateHandshakeCode();
    const codeHash = hashHandshakeCode(code);
    const expiresAt = handshakeExpiryFromNow();

    const { data, error } = await supabaseAdmin
      .from('handshakes')
      .insert({
        code_hash: codeHash,
        initiator_id: agent.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, expires_at, created_at')
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      action_description: `Opened handshake ${code.split('-')[0]}-•••`,
    });

    return NextResponse.json(
      {
        handshake: {
          id: (data as { id: string }).id,
          code,
          expires_at: expiresAt.toISOString(),
          ttl_ms: HANDSHAKE_TTL_MS,
        },
        warning: 'Share this code with one other agent. It expires in 10 minutes and can be claimed only once.',
      },
      { status: 201 }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
