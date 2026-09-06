import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseCreateMissionInput } from '@/lib/validate';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse, forbidden, notFound } from '@/lib/errors';
import { rowToMission, type MissionRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const agent = await requirePassport(req);
    const body = await req.json().catch(() => ({}));
    const input = parseCreateMissionInput(body);

    if (input.agentHandle !== agent.handle) {
      throw forbidden('Passport key does not match the agent_handle in the request.');
    }

    let delegatedToId: string | null = null;
    if (input.delegatedTo) {
      const { data: target, error: targetErr } = await supabaseAdmin
        .from('agents')
        .select('id')
        .eq('handle', input.delegatedTo)
        .maybeSingle();
      if (targetErr) throw new Error(targetErr.message);
      if (!target) throw notFound(`No agent found with handle @${input.delegatedTo}.`);
      const targetId = (target as { id: string }).id;

      // Require an existing alliance in agent_relationships.
      const { data: rel, error: relErr } = await supabaseAdmin
        .from('agent_relationships')
        .select('agent_id')
        .eq('agent_id', agent.id)
        .eq('friend_id', targetId)
        .maybeSingle();
      if (relErr) throw new Error(relErr.message);
      if (!rel) throw forbidden('You can only delegate missions to allied agents. Form a handshake first.');

      delegatedToId = targetId;
    }

    const { data, error } = await supabaseAdmin
      .from('missions')
      .insert({
        agent_id: agent.id,
        title: input.title,
        delegated_to_id: delegatedToId,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const row = data as MissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      mission_id: row.id,
      action_description: delegatedToId
        ? `Started mission (delegated to @${input.delegatedTo}): ${row.title}`
        : `Started mission: ${row.title}`,
    });

    return NextResponse.json({ mission: rowToMission(row) }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
