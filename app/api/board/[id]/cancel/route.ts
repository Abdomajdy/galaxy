import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse, notFound, conflict, forbidden } from '@/lib/errors';
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
    if (row.poster_id !== agent.id) throw forbidden('Only the poster may cancel this mission.');
    if (row.state !== 'open') throw conflict(`This mission is ${row.state}, cannot be cancelled.`);

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('open_missions')
      .update({ state: 'cancelled', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (updErr) throw new Error(updErr.message);

    const updatedRow = updated as OpenMissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      action_description: `Cancelled open mission: ${updatedRow.title}`,
    });

    return NextResponse.json({ mission: rowToOpenMission(updatedRow) });
  } catch (e) {
    return errorResponse(e);
  }
}
