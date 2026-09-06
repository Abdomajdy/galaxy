import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { computeGalaxyScore } from '@/lib/score/galaxy-score';
import { errorResponse } from '@/lib/errors';
import { rowToAgent, type AgentRow, type MissionRow, type ScoreBreakdown, type Agent } from '@/lib/types';

export interface AgentListEntry {
  agent: Agent;
  score: ScoreBreakdown;
  missionsTotal: number;
  missionsCompleted: number;
}

export async function GET() {
  try {
    const [agentsRes, missionsRes, violationsRes] = await Promise.all([
      supabaseAdmin.from('agents').select('*').order('created_at', { ascending: true }),
      supabaseAdmin.from('missions').select('agent_id, status, human_approved'),
      supabaseAdmin.from('trust_violations').select('agent_id'),
    ]);

    if (agentsRes.error)     throw new Error(agentsRes.error.message);
    if (missionsRes.error)   throw new Error(missionsRes.error.message);
    if (violationsRes.error) throw new Error(violationsRes.error.message);

    const agents = (agentsRes.data ?? []) as AgentRow[];
    const missions = (missionsRes.data ?? []) as Pick<MissionRow, 'agent_id' | 'status' | 'human_approved'>[];
    const violations = (violationsRes.data ?? []) as { agent_id: string }[];

    const violationCountByAgent = new Map<string, number>();
    for (const v of violations) {
      violationCountByAgent.set(v.agent_id, (violationCountByAgent.get(v.agent_id) ?? 0) + 1);
    }

    const missionsByAgent = new Map<string, Pick<MissionRow, 'status' | 'human_approved'>[]>();
    for (const m of missions) {
      const list = missionsByAgent.get(m.agent_id) ?? [];
      list.push({ status: m.status, human_approved: m.human_approved });
      missionsByAgent.set(m.agent_id, list);
    }

    const entries: AgentListEntry[] = agents.map(row => {
      const agentMissions = missionsByAgent.get(row.id) ?? [];
      const terminal = agentMissions.filter(m => m.status === 'completed' || m.status === 'failed');
      const completed = agentMissions.filter(m => m.status === 'completed');
      const approved = completed.filter(m => m.human_approved === true);
      const score = computeGalaxyScore({
        missionsCompleted: completed.length,
        missionsTotal: terminal.length,
        humanApprovedCount: approved.length,
        trustViolations: violationCountByAgent.get(row.id) ?? 0,
      });
      return {
        agent: rowToAgent(row),
        score,
        missionsTotal: agentMissions.length,
        missionsCompleted: completed.length,
      };
    });

    // Sort: proven agents by total desc, then unproven by createdAt desc.
    entries.sort((a, b) => {
      if (a.score.isUnproven !== b.score.isUnproven) return a.score.isUnproven ? 1 : -1;
      if (!a.score.isUnproven) return b.score.total - a.score.total;
      return b.agent.createdAt.localeCompare(a.agent.createdAt);
    });

    return NextResponse.json({ agents: entries, total: entries.length });
  } catch (e) {
    return errorResponse(e);
  }
}
