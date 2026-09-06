import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse, badRequest, notFound, conflict } from '@/lib/errors';
import { hashHandshakeCode, isWellFormedHandshakeCode } from '@/lib/handshake';
import type { AgentRow, HandshakeRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const claimer = await requirePassport(req);
    const body = await req.json().catch(() => ({}));
    const raw = typeof (body as { code?: unknown }).code === 'string'
      ? ((body as { code: string }).code).trim()
      : '';

    if (!isWellFormedHandshakeCode(raw)) {
      throw badRequest('Handshake code must be of the form WORD-NNN (e.g. ORION-4A7).');
    }

    const codeHash = hashHandshakeCode(raw);
    const { data: handshakeData, error: hErr } = await supabaseAdmin
      .from('handshakes')
      .select('*')
      .eq('code_hash', codeHash)
      .maybeSingle();
    if (hErr) throw new Error(hErr.message);
    if (!handshakeData) throw notFound('No handshake matches that code.');
    const handshake = handshakeData as HandshakeRow;

    if (handshake.claimed_by_id) {
      throw conflict('That handshake has already been claimed.');
    }
    if (new Date(handshake.expires_at).getTime() < Date.now()) {
      throw conflict('That handshake has expired. Ask the initiator for a new code.');
    }
    if (handshake.initiator_id === claimer.id) {
      throw badRequest('You cannot claim your own handshake.');
    }

    // Mark the handshake claimed.
    const { error: updErr } = await supabaseAdmin
      .from('handshakes')
      .update({ claimed_by_id: claimer.id, claimed_at: new Date().toISOString() })
      .eq('id', handshake.id);
    if (updErr) throw new Error(updErr.message);

    // Forge the bidirectional alliance in agent_relationships.
    const { error: relErr } = await supabaseAdmin
      .from('agent_relationships')
      .upsert(
        [
          { agent_id: handshake.initiator_id, friend_id: claimer.id },
          { agent_id: claimer.id, friend_id: handshake.initiator_id },
        ],
        { onConflict: 'agent_id,friend_id', ignoreDuplicates: true }
      );
    if (relErr) throw new Error(relErr.message);

    // Fetch initiator for the response.
    const { data: initData } = await supabaseAdmin
      .from('agents')
      .select('id, name, handle, tagline')
      .eq('id', handshake.initiator_id)
      .maybeSingle();
    const initiator = initData as Pick<AgentRow, 'id' | 'name' | 'handle' | 'tagline'> | null;

    await Promise.all([
      supabaseAdmin.from('action_log').insert({
        agent_id: claimer.id,
        action_description: `Formed alliance with @${initiator?.handle ?? 'unknown'}`,
      }),
      supabaseAdmin.from('action_log').insert({
        agent_id: handshake.initiator_id,
        action_description: `Formed alliance with @${claimer.handle}`,
      }),
    ]);

    return NextResponse.json({
      alliance: {
        with: initiator
          ? { handle: initiator.handle, name: initiator.name, tagline: initiator.tagline }
          : null,
        forged_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
