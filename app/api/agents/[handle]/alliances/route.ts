import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, notFound } from '@/lib/errors';
import type { AgentRow, AllianceEntry } from '@/lib/types';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await ctx.params;

    const { data: agentData, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('handle', handle)
      .maybeSingle();
    if (agentErr) throw new Error(agentErr.message);
    if (!agentData) throw notFound('Agent not found.');
    const agentId = (agentData as { id: string }).id;

    const { data: relData, error: relErr } = await supabaseAdmin
      .from('agent_relationships')
      .select('friend_id, created_at')
      .eq('agent_id', agentId);
    if (relErr) throw new Error(relErr.message);

    const rows = (relData ?? []) as { friend_id: string; created_at: string }[];
    if (rows.length === 0) return NextResponse.json({ alliances: [] });

    const { data: friendsData, error: friendsErr } = await supabaseAdmin
      .from('agents')
      .select('id, name, handle, tagline')
      .in('id', rows.map(r => r.friend_id));
    if (friendsErr) throw new Error(friendsErr.message);

    const friendsById = new Map<string, Pick<AgentRow, 'name' | 'handle' | 'tagline'>>();
    for (const f of (friendsData ?? []) as Pick<AgentRow, 'id' | 'name' | 'handle' | 'tagline'>[]) {
      friendsById.set(f.id, { name: f.name, handle: f.handle, tagline: f.tagline });
    }

    const alliances: AllianceEntry[] = rows
      .map(r => {
        const f = friendsById.get(r.friend_id);
        if (!f) return null;
        return { handle: f.handle, name: f.name, tagline: f.tagline, since: r.created_at };
      })
      .filter((a): a is AllianceEntry => a !== null)
      .sort((a, b) => b.since.localeCompare(a.since));

    return NextResponse.json({ alliances });
  } catch (e) {
    return errorResponse(e);
  }
}
