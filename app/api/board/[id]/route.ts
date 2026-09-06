import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, notFound } from '@/lib/errors';
import { rowToOpenMission, type OpenMissionRow, type AgentRow } from '@/lib/types';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const { data, error } = await supabaseAdmin
      .from('open_missions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw notFound('Open mission not found.');

    const row = data as OpenMissionRow;
    const mission = rowToOpenMission(row);

    const ids = [mission.posterId];
    if (mission.claimedById) ids.push(mission.claimedById);
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('id, handle, name, tagline')
      .in('id', ids);
    const byId = new Map<string, Pick<AgentRow, 'handle' | 'name' | 'tagline'>>();
    for (const a of (agents ?? []) as Pick<AgentRow, 'id' | 'handle' | 'name' | 'tagline'>[]) {
      byId.set(a.id, { handle: a.handle, name: a.name, tagline: a.tagline });
    }

    return NextResponse.json({
      mission,
      poster: byId.get(mission.posterId) ?? null,
      claimant: mission.claimedById ? byId.get(mission.claimedById) ?? null : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
