import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse } from '@/lib/errors';
import { computeGalaxyScore } from '@/lib/score/galaxy-score';
import { rowToMission, type AllianceEntry, type MissionRow, type AgentRow, type HandshakeRow } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const agent = await requirePassport(req);

    const [missionsRes, violationsRes, relRes, openHandshakesRes] = await Promise.all([
      supabaseAdmin
        .from('missions')
        .select('*')
        .or(`agent_id.eq.${agent.id},delegated_to_id.eq.${agent.id}`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('trust_violations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id),
      supabaseAdmin
        .from('agent_relationships')
        .select('friend_id, created_at')
        .eq('agent_id', agent.id),
      supabaseAdmin
        .from('handshakes')
        .select('*')
        .eq('initiator_id', agent.id)
        .is('claimed_by_id', null)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (missionsRes.error) throw new Error(missionsRes.error.message);
    if (violationsRes.error) throw new Error(violationsRes.error.message);
    if (relRes.error) throw new Error(relRes.error.message);
    if (openHandshakesRes.error) throw new Error(openHandshakesRes.error.message);

    const missionRows = (missionsRes.data ?? []) as MissionRow[];
    const ownMissions = missionRows.filter(m => m.agent_id === agent.id);
    const terminal = ownMissions.filter(m => m.status === 'completed' || m.status === 'failed');
    const completed = ownMissions.filter(m => m.status === 'completed');
    const approved = completed.filter(m => m.human_approved === true);
    const score = computeGalaxyScore({
      missionsCompleted: completed.length,
      missionsTotal: terminal.length,
      humanApprovedCount: approved.length,
      trustViolations: violationsRes.count ?? 0,
    });

    const relRows = (relRes.data ?? []) as { friend_id: string; created_at: string }[];
    let alliances: AllianceEntry[] = [];
    if (relRows.length > 0) {
      const { data: friends } = await supabaseAdmin
        .from('agents')
        .select('id, name, handle, tagline')
        .in('id', relRows.map(r => r.friend_id));
      const byId = new Map<string, Pick<AgentRow, 'name' | 'handle' | 'tagline'>>();
      for (const f of (friends ?? []) as Pick<AgentRow, 'id' | 'name' | 'handle' | 'tagline'>[]) {
        byId.set(f.id, { name: f.name, handle: f.handle, tagline: f.tagline });
      }
      alliances = relRows
        .map(r => {
          const f = byId.get(r.friend_id);
          return f ? { handle: f.handle, name: f.name, tagline: f.tagline, since: r.created_at } : null;
        })
        .filter((a): a is AllianceEntry => a !== null)
        .sort((a, b) => b.since.localeCompare(a.since));
    }

    const openHandshakes = (openHandshakesRes.data ?? []) as HandshakeRow[];

    return NextResponse.json({
      agent,
      score,
      recentMissions: missionRows.map(rowToMission),
      alliances,
      openHandshakes: openHandshakes.map(h => ({
        id: h.id,
        expiresAt: h.expires_at,
        createdAt: h.created_at,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
