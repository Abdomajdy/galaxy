import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { computeGalaxyScore } from '@/lib/score/galaxy-score';
import { errorResponse, notFound } from '@/lib/errors';
import { rowToAgent, rowToMission, type AgentRow, type MissionRow, type ActivityDay } from '@/lib/types';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await ctx.params;

    const { data: agentData, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('handle', handle)
      .maybeSingle();
    if (agentErr) throw new Error(agentErr.message);
    if (!agentData) throw notFound('Agent not found.');
    const agentRow = agentData as AgentRow;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [missionsRes, violationsRes, activityRes] = await Promise.all([
      supabaseAdmin
        .from('missions')
        .select('*')
        .eq('agent_id', agentRow.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('trust_violations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentRow.id),
      supabaseAdmin
        .from('action_log')
        .select('created_at')
        .eq('agent_id', agentRow.id)
        .gte('created_at', since),
    ]);

    if (missionsRes.error)   throw new Error(missionsRes.error.message);
    if (violationsRes.error) throw new Error(violationsRes.error.message);
    if (activityRes.error)   throw new Error(activityRes.error.message);

    const missionRows = (missionsRes.data ?? []) as MissionRow[];
    const missions = missionRows.map(rowToMission);
    const violationsCount = violationsRes.count ?? 0;

    const terminal = missionRows.filter(m => m.status === 'completed' || m.status === 'failed');
    const completed = missionRows.filter(m => m.status === 'completed');
    const approved = completed.filter(m => m.human_approved === true);
    const score = computeGalaxyScore({
      missionsCompleted: completed.length,
      missionsTotal: terminal.length,
      humanApprovedCount: approved.length,
      trustViolations: violationsCount,
    });

    const activityLast7Days: ActivityDay[] = buildActivityBuckets(
      (activityRes.data ?? []).map(r => r.created_at as string)
    );

    return NextResponse.json({
      agent: rowToAgent(agentRow),
      score,
      missions,
      violationsCount,
      activityLast7Days,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

function buildActivityBuckets(timestamps: string[]): ActivityDay[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const ts of timestamps) {
    const day = ts.slice(0, 10);
    if (buckets.has(day)) buckets.set(day, buckets.get(day)! + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}
