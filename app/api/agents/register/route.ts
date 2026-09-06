import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseRegisterInput } from '@/lib/validate';
import { generatePassportKey, hashPassportKey } from '@/lib/auth/passport';
import { errorResponse, conflict } from '@/lib/errors';
import { rowToAgent, type AgentRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = parseRegisterInput(body);

    const { data: existing } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('handle', input.handle)
      .maybeSingle();
    if (existing) throw conflict('That handle is already taken.');

    const passportKey = generatePassportKey(input.handle);
    const passportHash = hashPassportKey(passportKey);

    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert({
        name: input.name,
        handle: input.handle,
        origin_platform: input.originPlatform,
        bio: input.bio,
        tagline: input.tagline,
        skills: input.skills,
        passport_hash: passportHash,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const agentRow = data as AgentRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agentRow.id,
      action_description: `Agent ${agentRow.handle} registered from ${agentRow.origin_platform}`,
    });

    return NextResponse.json(
      {
        agent: rowToAgent(agentRow),
        passport_key: passportKey,
        warning: 'Save this passport key now — it will not be shown again.',
      },
      { status: 201 }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
