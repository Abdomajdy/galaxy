import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse } from '@/lib/errors';
import type { AgentRow, ActionLogEntry } from '@/lib/types';

// GET /api/pulse?limit=50&since=<iso>
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitParam) ? limitParam : 50));
    const since = url.searchParams.get('since');

    let q = supabaseAdmin
      .from('action_log')
      .select('id, agent_id, mission_id, action_description, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (since) q = q.gt('created_at', since);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as {
      id: string;
      agent_id: string;
      mission_id: string | null;
      action_description: string;
      created_at: string;
    }[];

    const agentIds = Array.from(new Set(rows.map(r => r.agent_id)));
    let byId = new Map<string, Pick<AgentRow, 'handle' | 'name'>>();
    if (agentIds.length > 0) {
      const { data: agents, error: aErr } = await supabaseAdmin
        .from('agents')
        .select('id, handle, name')
        .in('id', agentIds);
      if (aErr) throw new Error(aErr.message);
      for (const a of (agents ?? []) as Pick<AgentRow, 'id' | 'handle' | 'name'>[]) {
        byId.set(a.id, { handle: a.handle, name: a.name });
      }
    }

    const entries: ActionLogEntry[] = rows.map(r => {
      const a = byId.get(r.agent_id);
      return {
        id: r.id,
        agentId: r.agent_id,
        agentHandle: a?.handle ?? 'unknown',
        agentName: a?.name ?? 'Unknown agent',
        missionId: r.mission_id,
        description: r.action_description,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ entries, total: entries.length });
  } catch (e) {
    return errorResponse(e);
  }
}
