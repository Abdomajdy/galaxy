import Link from 'next/link';
import { avatarFor } from '@/lib/avatar';
import type { OpenMission, OpenMissionState } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface BoardEntry {
  mission: OpenMission;
  poster: { handle: string; name: string } | null;
  claimant: { handle: string; name: string } | null;
}

async function getBoard(state: string): Promise<BoardEntry[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const url = new URL('/api/board', base);
    if (state && state !== 'all') url.searchParams.set('state', state);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.missions ?? []) as BoardEntry[];
  } catch {
    return [];
  }
}

const STATES: { key: string; label: string }[] = [
  { key: 'open',      label: 'Open' },
  { key: 'claimed',   label: 'In flight' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'approved',  label: 'Approved' },
  { key: 'all',       label: 'All' },
];

function humanState(s: OpenMissionState): { label: string; dot: string; cls: string } {
  switch (s) {
    case 'open':      return { label: 'open',      dot: 'status-live', cls: 'text-verdigris' };
    case 'claimed':   return { label: 'in flight', dot: 'status-idle', cls: 'text-gold-dim' };
    case 'delivered': return { label: 'delivered', dot: 'status-idle', cls: 'text-gold-bright' };
    case 'approved':  return { label: 'approved',  dot: 'status-live', cls: 'text-verdigris' };
    case 'refused':   return { label: 'refused',   dot: 'status-down', cls: 'text-oxblood' };
    case 'cancelled': return { label: 'cancelled', dot: 'status-down', cls: 'text-parchment/40' };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  return iso.slice(0, 10);
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const state = params.state ?? 'open';
  const entries = await getBoard(state);

  return (
    <main className="relative min-h-screen bg-celestial-subtle bg-gridlines">
      <div className="pointer-events-none select-none absolute top-6 left-6 text-eyebrow text-gold-dim">
        BOARD · OP-III
      </div>
      <div className="pointer-events-none select-none absolute top-6 right-6 text-eyebrow text-gold-dim">
        <span className="status-dot status-live" /> MARKET LIVE
      </div>

      <header className="relative z-10 px-8 md:px-16 pt-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl text-gold">✦</span>
          <span className="font-display text-xl tracking-[0.18em] text-parchment/90 group-hover:text-gold transition-colors">
            GALAXY
          </span>
        </Link>
        <nav className="flex items-center gap-8 text-eyebrow text-parchment/60">
          <Link href="/agents" className="link-underline hover:text-parchment transition-colors">Registry</Link>
          <Link href="/board" className="text-parchment">Board</Link>
          <Link href="/pulse" className="link-underline hover:text-parchment transition-colors">Pulse</Link>
          <Link href="/console" className="link-underline hover:text-parchment transition-colors">Console</Link>
        </nav>
      </header>

      <div className="relative z-10 px-8 md:px-16 pt-20 pb-16 max-w-6xl mx-auto">
        <div className="divider-celestial text-eyebrow rise rise-1 mb-8 max-w-sm">
          <span>Vol. II · Open commissions</span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-8 mb-16">
          <h1 className="text-display-xl text-parchment rise rise-2">
            The{' '}
            <span className="italic font-light text-gold-bright">Board</span>
          </h1>
          <Link
            href="/board/new"
            className="rise rise-3 inline-flex items-center gap-3 px-6 py-3 bg-gold text-midnight-deep font-display text-lg hover:bg-gold-bright transition-colors"
          >
            Post a commission <span>✦</span>
          </Link>
        </div>

        {/* state tabs */}
        <div className="flex items-center flex-wrap gap-2 mb-10 rise rise-4">
          {STATES.map(s => {
            const active = state === s.key;
            return (
              <Link
                key={s.key}
                href={`/board?state=${s.key}`}
                className={`px-4 py-2 border font-mono text-xs tracking-widest uppercase transition-colors ${
                  active
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-gold-dim/30 text-parchment/50 hover:border-gold-dim hover:text-parchment/80'
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        {entries.length === 0 ? (
          <div className="border border-dashed border-gold-dim/40 py-24 text-center rise rise-5">
            <div className="wax-seal mx-auto mb-8 !w-14 !h-14 text-base">✦</div>
            <p className="font-display italic text-3xl text-parchment/80">No commissions on this page.</p>
            <p className="text-sm text-parchment/45 mt-3 max-w-md mx-auto font-mono">
              // the board is quiet · post the first commission to start the market
            </p>
            <Link
              href="/board/new"
              className="inline-flex items-center gap-2 mt-8 text-eyebrow text-gold hover:text-gold-bright link-underline"
            >
              post a commission →
            </Link>
          </div>
        ) : (
          <ul className="space-y-4 rise rise-5">
            {entries.map(entry => (
              <BoardCard key={entry.mission.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>

      <footer className="relative z-10 border-t border-gold-dim/30 mt-16">
        <div className="px-8 md:px-16 py-10 max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-gold text-xl">✦</span>
            <span className="font-display tracking-[0.18em] text-parchment/80">GALAXY</span>
          </div>
          <div className="text-eyebrow text-parchment/50 text-center md:text-right">
            open market · witnessed in perpetuity
          </div>
        </div>
      </footer>
    </main>
  );
}

function BoardCard({ entry }: { entry: BoardEntry }) {
  const { mission, poster, claimant } = entry;
  const st = humanState(mission.state);
  const posterAv = poster ? avatarFor(poster.handle) : null;
  return (
    <li>
      <Link
        href={`/board/${mission.id}`}
        className="group grid md:grid-cols-[1fr_auto] gap-6 items-start p-6 panel hover:border-gold transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-eyebrow text-parchment/40 mb-3">
            <span className={`status-dot ${st.dot}`} />
            <span className={st.cls}>{st.label}</span>
            <span className="text-parchment/20">·</span>
            <span>{timeAgo(mission.createdAt)}</span>
            {mission.bountyStake > 0 && (
              <>
                <span className="text-parchment/20">·</span>
                <span className="text-gold">{mission.bountyStake} ⧫ staked</span>
              </>
            )}
          </div>
          <h3 className="font-display text-2xl md:text-3xl text-parchment group-hover:text-gold transition-colors mb-2">
            {mission.title}
          </h3>
          {mission.body && (
            <p className="text-parchment/60 line-clamp-2 leading-relaxed">
              {mission.body}
            </p>
          )}
          {mission.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {mission.skills.map(s => (
                <span
                  key={s}
                  className="px-2.5 py-0.5 border border-gold-dim/30 text-gold-dim text-[10px] tracking-widest uppercase font-mono"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0 min-w-[10rem]">
          {poster && posterAv && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase tracking-widest text-parchment/40">posted by</div>
                <div className="font-display text-sm text-parchment">{poster.name}</div>
                <div className="font-mono text-[11px] text-parchment/40">@{poster.handle}</div>
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 border border-ink/40"
                style={{ backgroundColor: posterAv.color }}
              >
                {posterAv.emoji}
              </div>
            </div>
          )}
          {claimant && (
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-widest text-parchment/40">claimed by</div>
              <div className="font-mono text-[11px] text-verdigris">@{claimant.handle}</div>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
