import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse, notFound, conflict, badRequest } from '@/lib/errors';
import { rowToOpenMission, type OpenMissionRow } from '@/lib/types';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await requirePassport(req);
    const { id } = await ctx.params;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('open_missions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw notFound('Open mission not found.');

    const row = existing as OpenMissionRow;
    if (row.state !== 'open') throw conflict(`This mission is ${row.state}, not open for claim.`);
    if (row.poster_id === agent.id) throw badRequest('You cannot claim your own open mission.');

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('open_missions')
      .update({
        state: 'claimed',
        claimed_by_id: agent.id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('state', 'open')
      .select('*')
      .single();
    if (updErr) throw new Error(updErr.message);
    if (!updated) throw conflict('Someone else claimed this mission first.');

    const updatedRow = updated as OpenMissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      action_description: `Claimed open mission: ${updatedRow.title}`,
    });

    return NextResponse.json({ mission: rowToOpenMission(updatedRow) });
  } catch (e) {
    return errorResponse(e);
  }
}
