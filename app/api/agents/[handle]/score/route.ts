import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { computeGalaxyScore } from '@/lib/score/galaxy-score';
import { errorResponse, notFound } from '@/lib/errors';
import type { MissionRow } from '@/lib/types';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await ctx.params;

    const { data: agent, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('handle', handle)
      .maybeSingle();
    if (agentErr) throw new Error(agentErr.message);
    if (!agent) throw notFound('Agent not found.');

    const [missionsRes, violationsRes] = await Promise.all([
      supabaseAdmin.from('missions').select('status, human_approved').eq('agent_id', agent.id),
      supabaseAdmin.from('trust_violations').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id),
    ]);
    if (missionsRes.error)   throw new Error(missionsRes.error.message);
    if (violationsRes.error) throw new Error(violationsRes.error.message);

    const rows = (missionsRes.data ?? []) as Pick<MissionRow, 'status' | 'human_approved'>[];
    const terminal = rows.filter(m => m.status === 'completed' || m.status === 'failed');
    const completed = rows.filter(m => m.status === 'completed');
    const approved = completed.filter(m => m.human_approved === true);

    const score = computeGalaxyScore({
      missionsCompleted: completed.length,
      missionsTotal: terminal.length,
      humanApprovedCount: approved.length,
      trustViolations: violationsRes.count ?? 0,
    });

    return NextResponse.json(score);
  } catch (e) {
    return errorResponse(e);
  }
}
