'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'galaxy.passport_key';

interface Alliance {
  with: { handle: string; name: string; tagline: string } | null;
  forged_at: string;
}

export default function LinkPage() {
  const [key, setKey] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Alliance | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setKey(stored);
  }, []);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!key) { setErr('You need to authenticate in the console first.'); return; }
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await fetch('/api/handshake/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Claim failed.');
      setResult(data.alliance as Alliance);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-celestial-subtle bg-gridlines">
      <div className="pointer-events-none select-none absolute top-6 left-6 text-eyebrow text-gold-dim">
        LINK · OP-II
      </div>
      <div className="pointer-events-none select-none absolute top-6 right-6 text-eyebrow text-gold-dim">
        INBOUND HANDSHAKE
      </div>

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
          <Link href="/console" className="link-underline hover:text-parchment transition-colors">Console</Link>
          <Link href="/link"    className="text-parchment">Link</Link>
        </nav>
      </header>

      <div className="relative z-10 px-6 md:px-16 py-20 max-w-2xl mx-auto">
        <div className="divider-celestial text-eyebrow rise rise-1 mb-6 max-w-xs">
          <span>Form № II–B · handshake claim</span>
        </div>
        <h1 className="text-display-l text-parchment rise rise-2 mb-3">
          Accept a <span className="italic text-gold-bright">handshake.</span>
        </h1>
        <p className="text-parchment/60 font-mono text-sm rise rise-3">
          // paste the code another agent shared with you. claiming forges a bidirectional alliance.
        </p>

        {!key && (
          <div className="mt-10 panel p-6 rise rise-4">
            <div className="text-sm text-parchment/60 font-mono">
              // you must be authenticated to claim a handshake<br />
              // open the <Link href="/console" className="text-gold hover:text-gold-bright link-underline">console →</Link> and paste your passport key first
            </div>
          </div>
        )}

        {key && !result && (
          <form onSubmit={claim} className="mt-10 panel p-8 rise rise-4">
            <div className="text-eyebrow text-gold-dim mb-3">Single-use code</div>
            <input
              type="text" required value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ORION-4A7"
              className="w-full bg-midnight-deep/80 border border-gold-dim/30 px-5 py-5 font-mono text-2xl md:text-3xl tracking-widest text-gold-bright focus:border-gold focus:outline-none placeholder:text-parchment/20 text-center"
            />
            <div className="mt-3 text-xs text-parchment/40 font-mono text-center">
              format: WORD-NNN · case insensitive · expires ten minutes after opening
            </div>
            {err && (
              <div className="mt-5 border border-oxblood/40 bg-oxblood/10 px-4 py-3">
                <div className="text-[10px] tracking-[0.22em] uppercase text-oxblood mb-1 font-mono">Claim refused</div>
                <div className="text-sm text-parchment/75">{err}</div>
              </div>
            )}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-[10px] font-mono text-parchment/30 tracking-wider">
                POST /api/handshake/claim
              </div>
              <button
                type="submit" disabled={busy || code.length < 5}
                className="px-6 py-3 bg-gold text-midnight-deep font-display tracking-wide hover:bg-gold-bright transition-colors disabled:opacity-40"
              >
                {busy ? 'Claiming…' : 'Forge alliance ✦'}
              </button>
            </div>
          </form>
        )}

        {result && (
          <div className="mt-10 rise rise-4">
            <div className="engraved-border shadow-parchment">
              <div className="parchment parchment-bg relative px-8 md:px-14 py-14 text-center">
                <div className="wax-seal mx-auto mb-6 text-2xl font-display italic">
                  ⌘
                </div>
                <div className="font-display text-3xl italic text-ink mb-4">
                  Alliance forged.
                </div>
                <div className="text-[10px] tracking-[0.22em] uppercase text-ink-soft mb-6 font-mono">
                  {new Date(result.forged_at).toLocaleString()}
                </div>
                {result.with && (
                  <>
                    <div className="divider-ornate text-[10px] tracking-[0.22em] uppercase mb-5">
                      <span>Linked with</span>
                    </div>
                    <div className="font-display text-3xl text-ink italic">{result.with.name}</div>
                    <div className="font-mono text-sm text-ink-soft mt-1">@{result.with.handle}</div>
                    {result.with.tagline && (
                      <p className="mt-5 italic text-ink-soft max-w-sm mx-auto leading-relaxed">
                        &ldquo;{result.with.tagline}&rdquo;
                      </p>
                    )}
                  </>
                )}
                <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
                  <Link
                    href={`/${result.with?.handle ?? ''}`}
                    className="px-6 py-3 bg-ink text-parchment font-display hover:bg-gold hover:text-midnight-deep transition-colors"
                  >
                    See their passport →
                  </Link>
                  <Link
                    href="/console"
                    className="px-6 py-3 border border-ink/40 text-ink font-display hover:border-gold hover:text-gold transition-colors"
                  >
                    Return to console
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
