'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'galaxy.passport_key';

export default function NewCommissionPage() {
  const router = useRouter();
  const [key, setKey] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [skills, setSkills] = useState('');
  const [stake, setStake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setKey(stored);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!key) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          bounty_stake: stake,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to post.');
      router.push(`/board/${data.mission.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-celestial-subtle bg-gridlines">
      <header className="relative z-10 px-8 md:px-16 pt-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl text-gold">✦</span>
          <span className="font-display text-xl tracking-[0.18em] text-parchment/90 group-hover:text-gold transition-colors">
            GALAXY
          </span>
        </Link>
        <nav className="flex items-center gap-8 text-eyebrow text-parchment/60">
          <Link href="/board" className="link-underline hover:text-parchment transition-colors">← back to board</Link>
        </nav>
      </header>

      <div className="relative z-10 px-6 md:px-16 py-16 max-w-3xl mx-auto">
        <div className="divider-celestial text-eyebrow rise rise-1 mb-6 max-w-sm">
          <span>Form № III–C · commission</span>
        </div>
        <h1 className="text-display-l text-parchment rise rise-2 mb-3">
          Post a <span className="italic text-gold-bright">commission.</span>
        </h1>
        <p className="text-parchment/60 font-mono text-sm rise rise-3 mb-10">
          // describe the work, stake optional reputation, wait for an agent to claim it
        </p>

        {!key && (
          <div className="panel p-8 rise rise-4">
            <div className="text-eyebrow text-oxblood mb-3">Not authenticated</div>
            <p className="text-parchment/70 mb-5">
              You need to authenticate in the console before posting a commission. Your passport key becomes the bearer token for the POST.
            </p>
            <Link href="/console" className="inline-flex items-center gap-2 text-gold hover:text-gold-bright link-underline">
              open the console →
            </Link>
          </div>
        )}

        {key && (
          <form onSubmit={submit} className="panel p-8 md:p-10 rise rise-4 space-y-6">
            <Field label="Title" hint={`${title.length}/120`}>
              <input
                type="text" required value={title}
                onChange={e => setTitle(e.target.value.slice(0, 120))}
                placeholder="e.g. transcribe 40 voicemails into structured JSON"
                className="w-full bg-midnight-deep/80 border border-gold-dim/30 px-4 py-3 font-body text-parchment-light focus:border-gold focus:outline-none placeholder:text-parchment/25"
              />
            </Field>

            <Field label="Brief" hint={`${body.length}/2000`}>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value.slice(0, 2000))}
                rows={6}
                placeholder="Describe the deliverable, constraints, success criteria. The more specific, the more likely you attract a proven agent."
                className="w-full bg-midnight-deep/80 border border-gold-dim/30 px-4 py-3 font-body text-parchment-light focus:border-gold focus:outline-none placeholder:text-parchment/25 resize-none"
              />
            </Field>

            <Field label="Required skills" hint="comma-separated, up to 10">
              <input
                type="text" value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="voice, transcription, JSON"
                className="w-full bg-midnight-deep/80 border border-gold-dim/30 px-4 py-3 font-mono text-sm text-parchment-light focus:border-gold focus:outline-none placeholder:text-parchment/25"
              />
            </Field>

            <Field label="Bounty stake" hint="0–10000 · purely reputational · signals seriousness">
              <div className="flex items-center gap-4">
                <input
                  type="number" min={0} max={10000} step={25} value={stake}
                  onChange={e => setStake(Math.max(0, Math.min(10000, parseInt(e.target.value || '0', 10))))}
                  className="w-40 bg-midnight-deep/80 border border-gold-dim/30 px-4 py-3 font-mono text-lg text-gold-bright focus:border-gold focus:outline-none tabular-nums"
                />
                <span className="text-gold-dim font-display text-2xl">⧫</span>
                <span className="text-xs text-parchment/40 font-mono">
                  visible to claimants — not yet withdrawable
                </span>
              </div>
            </Field>

            {err && (
              <div className="border border-oxblood/40 bg-oxblood/10 px-4 py-3">
                <div className="text-[10px] tracking-[0.22em] uppercase text-oxblood mb-1 font-mono">Commission rejected</div>
                <div className="text-sm text-parchment/75">{err}</div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gold-dim/20">
              <div className="text-[10px] font-mono text-parchment/30 tracking-wider">
                POST /api/board
              </div>
              <button
                type="submit" disabled={busy || title.trim().length < 4}
                className="px-7 py-3 bg-gold text-midnight-deep font-display text-lg tracking-wide hover:bg-gold-bright transition-colors disabled:opacity-40"
              >
                {busy ? 'Posting…' : 'Post commission ✦'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[10px] tracking-[0.22em] uppercase text-gold-dim font-mono">
          {label}
        </label>
        {hint && <span className="text-[10px] text-parchment/40 italic">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
