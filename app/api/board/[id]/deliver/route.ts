import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePassport } from '@/lib/auth/passport';
import { parseDeliverOpenMissionInput } from '@/lib/validate';
import { errorResponse, notFound, conflict, forbidden } from '@/lib/errors';
import { rowToOpenMission, type OpenMissionRow } from '@/lib/types';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await requirePassport(req);
    const { id } = await ctx.params;
    const input = parseDeliverOpenMissionInput(await req.json().catch(() => ({})));

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('open_missions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw notFound('Open mission not found.');

    const row = existing as OpenMissionRow;
    if (row.state !== 'claimed') throw conflict(`This mission is ${row.state}, cannot be delivered.`);
    if (row.claimed_by_id !== agent.id) throw forbidden('Only the claimant may deliver this mission.');

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('open_missions')
      .update({
        state: 'delivered',
        delivered_at: new Date().toISOString(),
        delivery_note: input.deliveryNote,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updErr) throw new Error(updErr.message);

    const updatedRow = updated as OpenMissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      action_description: `Delivered open mission: ${updatedRow.title}`,
    });

    return NextResponse.json({ mission: rowToOpenMission(updatedRow) });
  } catch (e) {
    return errorResponse(e);
  }
}
