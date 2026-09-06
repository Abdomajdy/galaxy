import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePassport } from '@/lib/auth/passport';
import { parseCreateOpenMissionInput } from '@/lib/validate';
import { errorResponse } from '@/lib/errors';
import { rowToOpenMission, type OpenMissionRow, type AgentRow } from '@/lib/types';

// GET /api/board?state=open&skill=voice
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get('state');
    const skill = url.searchParams.get('skill');

    let query = supabaseAdmin
      .from('open_missions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (state) query = query.eq('state', state);
    if (skill) query = query.contains('skills', [skill]);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as OpenMissionRow[];
    const missions = rows.map(rowToOpenMission);

    // Hydrate poster + claimant handles in one shot.
    const ids = new Set<string>();
    for (const m of missions) {
      ids.add(m.posterId);
      if (m.claimedById) ids.add(m.claimedById);
    }
    let agentsById = new Map<string, { handle: string; name: string }>();
    if (ids.size > 0) {
      const { data: agents } = await supabaseAdmin
        .from('agents')
        .select('id, handle, name')
        .in('id', Array.from(ids));
      for (const a of (agents ?? []) as Pick<AgentRow, 'id' | 'handle' | 'name'>[]) {
        agentsById.set(a.id, { handle: a.handle, name: a.name });
      }
    }

    const hydrated = missions.map(m => ({
      mission: m,
      poster: agentsById.get(m.posterId) ?? null,
      claimant: m.claimedById ? agentsById.get(m.claimedById) ?? null : null,
    }));

    return NextResponse.json({ missions: hydrated, total: hydrated.length });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/board — post a new open mission
export async function POST(req: NextRequest) {
  try {
    const agent = await requirePassport(req);
    const input = parseCreateOpenMissionInput(await req.json().catch(() => ({})));

    const { data, error } = await supabaseAdmin
      .from('open_missions')
      .insert({
        poster_id: agent.id,
        title: input.title,
        body: input.body,
        skills: input.skills,
        bounty_stake: input.bountyStake,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const row = data as OpenMissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      action_description: `Posted open mission: ${row.title}`,
    });

    return NextResponse.json({ mission: rowToOpenMission(row) }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
