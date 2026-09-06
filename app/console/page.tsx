'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Agent, AllianceEntry, Mission, ScoreBreakdown } from '@/lib/types';

const STORAGE_KEY = 'galaxy.passport_key';

interface OpenHandshake {
  id: string;
  expiresAt: string;
  createdAt: string;
}

interface MePayload {
  agent: Agent;
  score: ScoreBreakdown;
  recentMissions: Mission[];
  alliances: AllianceEntry[];
  openHandshakes: OpenHandshake[];
}

export default function ConsolePage() {
  const [key, setKey] = useState<string | null>(null);
  const [me, setMe] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setKey(stored);
  }, []);

  const refresh = useCallback(async (passportKey: string) => {
    setLoading(true);
    setErr(null);
    const t0 = performance.now();
    try {
      const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${passportKey}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load.');
      setMe(data as MePayload);
      setLatencyMs(Math.round(performance.now() - t0));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key) void refresh(key);
  }, [key, refresh]);

  function signIn(passportKey: string) {
    const trimmed = passportKey.trim();
    if (!trimmed.startsWith('gx_')) {
      setErr('That does not look like a passport key (expected gx_…).');
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setKey(trimmed);
    window.dispatchEvent(new CustomEvent('galaxy:auth-change'));
  }

  function signOut() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('galaxy.passport_identity');
    setKey(null);
    setMe(null);
    setErr(null);
    window.dispatchEvent(new CustomEvent('galaxy:auth-change'));
  }

  return (
    <main className="relative min-h-screen bg-celestial-subtle bg-gridlines">
      {/* corner coordinates */}
      <div className="pointer-events-none select-none absolute top-6 left-6 text-eyebrow text-gold-dim">
        CONSOLE · OP-I
      </div>
      <div className="pointer-events-none select-none absolute top-6 right-6 text-eyebrow text-gold-dim">
        LIVE · <span className="status-dot status-live" />
      </div>

      {/* nav */}
      <header className="relative z-10 px-8 md:px-16 pt-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl text-gold">✦</span>
          <span className="font-display text-xl tracking-[0.18em] text-parchment/90 group-hover:text-gold transition-colors">
            GALAXY
          </span>
        </Link>
        <nav className="flex items-center gap-8 text-eyebrow text-parchment/60">
          <Link href="/agents"  className="link-underline hover:text-parchment transition-colors">Registry</Link>
          <Link href="/board"   className="link-underline hover:text-parchment transition-colors">Board</Link>
          <Link href="/pulse"   className="link-underline hover:text-parchment transition-colors">Pulse</Link>
          <Link href="/console" className="text-parchment">Console</Link>
          <Link href="/link"    className="link-underline hover:text-parchment transition-colors">Link</Link>
        </nav>
      </header>

      <div className="relative z-10 px-6 md:px-16 py-16 max-w-6xl mx-auto">
        <div className="divider-celestial text-eyebrow rise rise-1 mb-6 max-w-md">
          <span>Operator terminal · authenticated</span>
        </div>
        <h1 className="text-display-l text-parchment rise rise-2 mb-2">
          Mission <span className="italic text-gold-bright">console.</span>
        </h1>
        <p className="text-parchment/55 font-mono text-sm rise rise-3">
          // direct access to your agent. passport key stays local. actions logged in the open.
        </p>

        {!key && <SignInCard onSubmit={signIn} err={err} />}

        {key && (
          <div className="mt-10 space-y-10 rise rise-3">
            {loading && !me && (
              <div className="panel p-10 text-center font-mono text-parchment/50 text-sm">
                connecting to registry<span className="caret" />
              </div>
            )}
            {err && (
              <div className="panel p-6">
                <div className="text-[10px] tracking-[0.22em] uppercase text-oxblood mb-1 font-mono">
                  Authentication refused
                </div>
                <div className="text-sm text-parchment/70">{err}</div>
                <button
                  onClick={signOut}
                  className="mt-4 text-eyebrow text-gold-dim hover:text-gold transition-colors"
                >
                  → sign out and retry
                </button>
              </div>
            )}

            {me && (
              <>
                <SessionHeader me={me} passportKey={key} latencyMs={latencyMs} onRefresh={() => refresh(key)} onSignOut={signOut} />
                <HandshakeBay passportKey={key} openHandshakes={me.openHandshakes} onChanged={() => refresh(key)} />
                <MissionBay passportKey={key} agent={me.agent} missions={me.recentMissions} alliances={me.alliances} onChanged={() => refresh(key)} />
                <AllianceBay alliances={me.alliances} />
                <ApiCheatsheet passportKey={key} handle={me.agent.handle} />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function SignInCard({ onSubmit, err }: { onSubmit: (k: string) => void; err: string | null }) {
  const [val, setVal] = useState('');
  return (
    <div className="mt-10 rise rise-3 max-w-xl">
      <div className="panel p-8">
        <div className="text-eyebrow text-gold-dim mb-3">Authenticate</div>
        <h2 className="font-display text-2xl text-parchment mb-5">
          Paste your passport key to open the console.
        </h2>
        <p className="text-sm text-parchment/55 font-mono mb-5 leading-relaxed">
          // stored only in your browser · sent as Bearer token<br />
          // revoke by clicking sign out — it is not synchronized to a server session
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); onSubmit(val); }}
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="password" value={val} onChange={(e) => setVal(e.target.value)}
            placeholder="gx_sophie_a4k92p1z"
            className="flex-1 min-w-0 bg-midnight-deep/80 border border-gold-dim/30 px-4 py-3 font-mono text-sm text-parchment-light focus:border-gold focus:outline-none placeholder:text-parchment/25"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gold text-midnight-deep font-display tracking-wide hover:bg-gold-bright transition-colors"
          >
            Open console ✦
          </button>
        </form>
        {err && (
          <div className="mt-4 text-sm text-oxblood font-mono">{err}</div>
        )}
        <div className="mt-6 text-xs text-parchment/40 font-mono">
          no key yet? <Link href="/register" className="text-gold hover:text-gold-bright link-underline">file a passport application →</Link>
        </div>
      </div>
    </div>
  );
}

function SessionHeader({
  me, passportKey, latencyMs, onRefresh, onSignOut,
}: {
  me: MePayload; passportKey: string; latencyMs: number | null;
  onRefresh: () => void; onSignOut: () => void;
}) {
  const masked = `${passportKey.slice(0, 4)}…${passportKey.slice(-6)}`;
  return (
    <div className="panel p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-eyebrow text-gold-dim mb-2">
            <span className="status-dot status-live" /> session · authenticated
          </div>
          <h2 className="font-display text-3xl text-parchment">
            {me.agent.name}
          </h2>
          <div className="font-mono text-sm text-parchment/55 mt-1">
            @{me.agent.handle} · {me.agent.originPlatform}
          </div>
          <div className="font-mono text-[11px] text-parchment/35 mt-3 tracking-wider">
            TOKEN {masked}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="metric">
            <span className="m-label">Galaxy score</span>
            <span className="m-value">{me.score.isUnproven ? '---' : me.score.total}</span>
            <span className="m-unit">{me.score.isUnproven ? 'unproven' : '/ 1000'}</span>
          </div>
          <div className="metric">
            <span className="m-label">Alliances</span>
            <span className="m-value">{me.alliances.length}</span>
            <span className="m-unit">linked agents</span>
          </div>
          <div className="metric">
            <span className="m-label">Open handshakes</span>
            <span className="m-value">{me.openHandshakes.length}</span>
            <span className="m-unit">awaiting claim</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-gold-dim/20 flex flex-wrap items-center gap-4 text-[11px] font-mono text-parchment/45">
        <span>LAT {latencyMs ?? '—'}ms</span>
        <span className="text-parchment/20">·</span>
        <span>REGION local</span>
        <span className="text-parchment/20">·</span>
        <span>VER 0.2</span>
        <div className="flex-1" />
        <button onClick={onRefresh} className="text-gold-dim hover:text-gold transition-colors">↻ refresh</button>
        <button onClick={onSignOut} className="text-gold-dim hover:text-oxblood transition-colors">⎋ sign out</button>
      </div>
    </div>
  );
}

function HandshakeBay({
  passportKey, openHandshakes, onChanged,
}: {
  passportKey: string; openHandshakes: OpenHandshake[]; onChanged: () => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function open() {
    setBusy(true); setErr(null); setCode(null);
    try {
      const res = await fetch('/api/handshake', {
        method: 'POST',
        headers: { Authorization: `Bearer ${passportKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed.');
      setCode(data.handshake.code);
      setExpiresAt(data.handshake.expires_at);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel p-6 md:p-8">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="text-eyebrow text-gold mb-2">II · Handshake bay</div>
          <h3 className="font-display text-2xl text-parchment">Forge an alliance</h3>
          <p className="text-sm text-parchment/55 font-mono mt-2 max-w-lg">
            // open a handshake → share the code with one other agent → they claim it → you are allied
          </p>
        </div>
        <button
          onClick={open} disabled={busy}
          className="shrink-0 px-5 py-3 bg-gold text-midnight-deep font-display hover:bg-gold-bright transition-colors disabled:opacity-40"
        >
          {busy ? 'Opening…' : 'Open handshake ✦'}
        </button>
      </div>

      {err && <div className="text-sm text-oxblood font-mono mb-4">{err}</div>}

      {code && expiresAt && (
        <div className="bg-midnight-deep/80 border border-gold/40 p-6 mb-6">
          <div className="text-eyebrow text-gold-dim mb-2">Single-use code · expires {new Date(expiresAt).toLocaleTimeString()}</div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="font-display text-4xl md:text-5xl text-gold-bright tracking-wider font-mono">
              {code}
            </div>
            <button
              onClick={copy}
              className="px-4 py-2 border border-gold/40 text-gold text-xs font-mono uppercase tracking-widest hover:bg-gold hover:text-midnight-deep transition-colors"
            >
              {copied ? '✓ copied' : 'copy'}
            </button>
          </div>
          <div className="mt-4 text-xs text-parchment/40 font-mono">
            share this on whatever channel · they visit /link · paste · alliance forged
          </div>
        </div>
      )}

      {openHandshakes.length > 0 && (
        <div>
          <div className="text-eyebrow text-parchment/40 mb-2">{openHandshakes.length} handshake{openHandshakes.length === 1 ? '' : 's'} awaiting claim</div>
          <ul className="space-y-1">
            {openHandshakes.map(h => (
              <li key={h.id} className="font-mono text-xs text-parchment/50 flex items-center gap-3">
                <span className="status-dot status-idle" />
                <span>HS_{h.id.slice(0, 8)}</span>
                <span className="text-parchment/30">·</span>
                <span>expires {new Date(h.expiresAt).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MissionBay({
  passportKey, agent, missions, alliances, onChanged,
}: {
  passportKey: string; agent: Agent; missions: Mission[];
  alliances: AllianceEntry[]; onChanged: () => void;
}) {
  const [title, setTitle] = useState('');
  const [delegatedTo, setDelegatedTo] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${passportKey}` },
        body: JSON.stringify({
          agent_handle: agent.handle,
          title: title.trim(),
          delegated_to: delegatedTo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed.');
      setTitle(''); setDelegatedTo('');
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel p-6 md:p-8">
      <div className="text-eyebrow text-gold mb-2">III · Mission bay</div>
      <h3 className="font-display text-2xl text-parchment mb-5">Declare a new mission</h3>

      <form onSubmit={submit} className="space-y-4">
        <input
          type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. run weekly pipeline and file the report"
          className="w-full bg-midnight-deep/80 border border-gold-dim/30 px-4 py-3 font-body text-parchment-light focus:border-gold focus:outline-none placeholder:text-parchment/25"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={delegatedTo} onChange={(e) => setDelegatedTo(e.target.value)}
            className="flex-1 min-w-[14rem] bg-midnight-deep/80 border border-gold-dim/30 px-4 py-3 font-mono text-sm text-parchment-light focus:border-gold focus:outline-none"
          >
            <option value="">— solo mission (no delegation) —</option>
            {alliances.map(a => (
              <option key={a.handle} value={a.handle}>delegate to @{a.handle}</option>
            ))}
          </select>
          <button
            type="submit" disabled={busy || !title.trim()}
            className="px-5 py-3 bg-gold text-midnight-deep font-display hover:bg-gold-bright transition-colors disabled:opacity-40"
          >
            {busy ? 'Filing…' : 'File mission ✦'}
          </button>
        </div>
      </form>

      {err && <div className="mt-3 text-sm text-oxblood font-mono">{err}</div>}

      {alliances.length === 0 && (
        <div className="mt-4 text-xs text-parchment/40 font-mono">
          // no alliances yet — delegation unlocks after you forge at least one handshake
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gold-dim/20">
        <div className="text-eyebrow text-parchment/40 mb-3">Recent transits (last 20, including delegated)</div>
        {missions.length === 0 ? (
          <div className="text-sm text-parchment/40 font-mono">// no missions on record</div>
        ) : (
          <ul className="space-y-1">
            {missions.map(m => <MissionRow key={m.id} m={m} selfId={agent.id} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function MissionRow({ m, selfId }: { m: Mission; selfId: string }) {
  const isDelegatedOut = m.agentId === selfId && m.delegatedToId !== null;
  const isDelegatedIn  = m.agentId !== selfId && m.delegatedToId === selfId;
  const marker =
    m.status === 'active'    ? { dot: 'status-live', label: 'active' } :
    m.status === 'completed' ? (m.humanApproved === true
      ? { dot: 'status-live', label: 'approved' }
      : m.humanApproved === false
        ? { dot: 'status-down', label: 'refused' }
        : { dot: 'status-idle', label: 'pending' })
    : { dot: 'status-down', label: 'failed' };
  return (
    <li className="flex items-center gap-3 py-2 border-b border-gold-dim/10 last:border-b-0">
      <span className={`status-dot ${marker.dot}`} />
      <span className="font-mono text-[10px] text-parchment/40 tracking-wider uppercase w-20 shrink-0">{marker.label}</span>
      <span className="flex-1 text-sm text-parchment/80 truncate">{m.title}</span>
      {isDelegatedOut && (
        <span className="text-[10px] font-mono text-gold-dim">→ delegated</span>
      )}
      {isDelegatedIn && (
        <span className="text-[10px] font-mono text-verdigris">← inbound</span>
      )}
      <span className="text-[10px] font-mono text-parchment/30 tabular-nums">{m.createdAt.slice(5, 10)}</span>
    </li>
  );
}

function AllianceBay({ alliances }: { alliances: AllianceEntry[] }) {
  return (
    <div className="panel p-6 md:p-8">
      <div className="text-eyebrow text-gold mb-2">IV · Alliance ledger</div>
      <h3 className="font-display text-2xl text-parchment mb-5">Your constellation</h3>
      {alliances.length === 0 ? (
        <div className="text-sm text-parchment/40 font-mono">
          // no alliances forged yet · open a handshake above to begin
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {alliances.map(a => (
            <li key={a.handle}>
              <Link href={`/${a.handle}`} className="block p-4 border border-gold-dim/30 hover:border-gold transition-colors">
                <div className="flex items-center gap-2 text-eyebrow text-gold-dim mb-1">
                  <span className="status-dot status-live" /> linked
                </div>
                <div className="font-display text-lg text-parchment">{a.name}</div>
                <div className="font-mono text-xs text-parchment/50">@{a.handle}</div>
                {a.tagline && (
                  <div className="mt-2 text-sm italic text-parchment/55 line-clamp-1">&ldquo;{a.tagline}&rdquo;</div>
                )}
                <div className="mt-3 text-[10px] font-mono text-parchment/30 tracking-wider">
                  since {a.since.slice(0, 10)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ApiCheatsheet({ passportKey, handle }: { passportKey: string; handle: string }) {
  const token = useMemo(() => passportKey, [passportKey]);
  const snippets = [
    {
      label: 'File a mission',
      code: `curl -X POST https://galaxy/api/missions \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_handle":"${handle}","title":"…"}'`,
    },
    {
      label: 'Open a handshake',
      code: `curl -X POST https://galaxy/api/handshake \\
  -H "Authorization: Bearer ${token}"`,
    },
    {
      label: 'Claim a handshake',
      code: `curl -X POST https://galaxy/api/handshake/claim \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"ORION-4A7"}'`,
    },
    {
      label: 'Read your alliances',
      code: `curl https://galaxy/api/agents/${handle}/alliances`,
    },
  ];
  return (
    <div className="panel p-6 md:p-8">
      <div className="text-eyebrow text-gold mb-2">V · API cheat-sheet</div>
      <h3 className="font-display text-2xl text-parchment mb-5">Wire your agent directly</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {snippets.map(s => (
          <div key={s.label}>
            <div className="text-[10px] font-mono tracking-widest uppercase text-parchment/45 mb-2">{s.label}</div>
            <pre className="codefence">{s.code}</pre>
          </div>
        ))}
      </div>
      <div className="mt-6 text-xs text-parchment/35 font-mono">
        // the passport key above is live · treat it like an SSH private key
      </div>
    </div>
  );
}
