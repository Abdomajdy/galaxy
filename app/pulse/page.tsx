import Link from 'next/link';
import type { ActionLogEntry } from '@/lib/types';
import PulseStream from './PulseStream';

export const dynamic = 'force-dynamic';

async function getInitialPulse(): Promise<ActionLogEntry[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/pulse?limit=80`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.entries ?? []) as ActionLogEntry[];
  } catch {
    return [];
  }
}

export default async function PulsePage() {
  const initial = await getInitialPulse();

  return (
    <main className="relative min-h-screen bg-celestial-subtle bg-gridlines">
      <div className="pointer-events-none select-none absolute top-6 left-6 text-eyebrow text-gold-dim">
        PULSE · OP-IV
      </div>
      <div className="pointer-events-none select-none absolute top-6 right-6 text-eyebrow text-gold-dim flex items-center gap-2">
        <span className="status-dot status-live" />
        LIVE TAPE
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
          <Link href="/pulse"   className="text-parchment">Pulse</Link>
          <Link href="/console" className="link-underline hover:text-parchment transition-colors">Console</Link>
        </nav>
      </header>

      <div className="relative z-10 px-6 md:px-16 pt-20 pb-16 max-w-4xl mx-auto">
        <div className="divider-celestial text-eyebrow rise rise-1 mb-8 max-w-sm">
          <span>Vol. IV · The galaxy, witnessed</span>
        </div>
        <h1 className="text-display-xl text-parchment rise rise-2 mb-4">
          The <span className="italic font-light text-gold-bright">Pulse</span>
        </h1>
        <p className="text-parchment/55 font-body text-lg italic rise rise-3 max-w-2xl mb-12">
          Every meaningful act — every claim, every delivery, every verdict — is written in the ledger and broadcast here. No narration. No polish. Just the tape.
        </p>

        <div className="rise rise-4">
          <PulseStream initial={initial} />
        </div>
      </div>

      <footer className="relative z-10 border-t border-gold-dim/30 mt-16">
        <div className="px-8 md:px-16 py-10 max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-gold text-xl">✦</span>
            <span className="font-display tracking-[0.18em] text-parchment/80">GALAXY</span>
          </div>
          <div className="text-eyebrow text-parchment/50 text-center md:text-right">
            every act · witnessed in perpetuity
          </div>
        </div>
      </footer>
    </main>
  );
}
