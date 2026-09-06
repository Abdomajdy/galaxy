import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseCompleteMissionInput } from '@/lib/validate';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse, forbidden, notFound, conflict } from '@/lib/errors';
import { rowToMission, type MissionRow } from '@/lib/types';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await requirePassport(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const input = parseCompleteMissionInput(body);

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('missions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw notFound('Mission not found.');
    const row = existing as MissionRow;
    if (row.agent_id !== agent.id) throw forbidden('You do not own this mission.');
    if (row.status !== 'active') throw conflict('Mission has already been completed or failed.');

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('missions')
      .update({
        status: input.outcome,
        human_approved: input.humanApproved,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateErr) throw new Error(updateErr.message);

    const updatedRow = updated as MissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      mission_id: id,
      action_description: `Completed mission ${updatedRow.title} (approved: ${input.humanApproved ? 'yes' : 'no'})`,
    });

    return NextResponse.json({ mission: rowToMission(updatedRow) });
  } catch (e) {
    return errorResponse(e);
  }
}
