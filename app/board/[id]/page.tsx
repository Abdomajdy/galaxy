import { notFound } from 'next/navigation';
import Link from 'next/link';
import { avatarFor } from '@/lib/avatar';
import type { OpenMission } from '@/lib/types';
import CommissionActions from './CommissionActions';

export const dynamic = 'force-dynamic';

interface Payload {
  mission: OpenMission;
  poster: { handle: string; name: string; tagline: string } | null;
  claimant: { handle: string; name: string; tagline: string } | null;
}

async function getCommission(id: string): Promise<Payload | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/board/${id}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load commission.');
  return res.json();
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATE_META: Record<OpenMission['state'], { label: string; cls: string; dot: string }> = {
  open:      { label: 'Open for claim',     cls: 'text-verdigris',     dot: 'status-live' },
  claimed:   { label: 'In flight',          cls: 'text-gold-bright',   dot: 'status-idle' },
  delivered: { label: 'Delivered · awaiting verdict', cls: 'text-gold-bright', dot: 'status-idle' },
  approved:  { label: 'Approved',           cls: 'text-verdigris',     dot: 'status-live' },
  refused:   { label: 'Refused',            cls: 'text-oxblood',       dot: 'status-down' },
  cancelled: { label: 'Cancelled',          cls: 'text-parchment/40',  dot: 'status-down' },
};

export default async function CommissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCommission(id);
  if (!data) notFound();
  const { mission, poster, claimant } = data;
  const posterAv = poster ? avatarFor(poster.handle) : null;
  const claimantAv = claimant ? avatarFor(claimant.handle) : null;
  const meta = STATE_META[mission.state];

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
          <Link href="/console" className="link-underline hover:text-parchment transition-colors">Console</Link>
        </nav>
      </header>

      <div className="relative z-10 px-6 md:px-16 py-12 max-w-4xl mx-auto">
        <div className="rise rise-1 mb-4">
          <div className="flex items-center gap-3 text-eyebrow">
            <span className={`status-dot ${meta.dot}`} />
            <span className={meta.cls}>{meta.label}</span>
            <span className="text-parchment/20">·</span>
            <span className="text-parchment/40">COMMISSION No.&nbsp;{mission.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        <h1 className="text-display-l text-parchment rise rise-2 mb-6">{mission.title}</h1>

        {/* meta strip */}
        <div className="panel p-6 md:p-8 rise rise-3">
          <div className="grid md:grid-cols-3 gap-6">
            {poster && posterAv && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-parchment/40 mb-2">Posted by</div>
                <Link href={`/${poster.handle}`} className="flex items-center gap-3 group">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0 border border-ink/40"
                    style={{ backgroundColor: posterAv.color }}
                  >
                    {posterAv.emoji}
                  </div>
                  <div>
                    <div className="font-display text-lg text-parchment group-hover:text-gold transition-colors">{poster.name}</div>
                    <div className="font-mono text-xs text-parchment/50">@{poster.handle}</div>
                  </div>
                </Link>
              </div>
            )}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-parchment/40 mb-2">Bounty stake</div>
              <div className="font-display text-3xl text-gold">
                {mission.bountyStake > 0 ? (
                  <>
                    {mission.bountyStake} <span className="text-xl text-gold-dim">⧫</span>
                  </>
                ) : (
                  <span className="text-parchment/40 italic text-lg">none</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-parchment/40 mb-2">Filed</div>
              <div className="font-mono text-sm text-parchment/80">{formatStamp(mission.createdAt)}</div>
              {mission.claimedAt && (
                <div className="font-mono text-[11px] text-parchment/45 mt-1">claimed {formatStamp(mission.claimedAt)}</div>
              )}
              {mission.deliveredAt && (
                <div className="font-mono text-[11px] text-parchment/45 mt-1">delivered {formatStamp(mission.deliveredAt)}</div>
              )}
              {mission.resolvedAt && (
                <div className="font-mono text-[11px] text-parchment/45 mt-1">resolved {formatStamp(mission.resolvedAt)}</div>
              )}
            </div>
          </div>
        </div>

        {/* brief */}
        {mission.body && (
          <div className="mt-10 rise rise-4">
            <div className="text-eyebrow text-gold mb-3">Brief</div>
            <div className="panel p-8 prose-parchment">
              <p className="text-parchment/80 whitespace-pre-wrap leading-relaxed text-base md:text-lg">
                {mission.body}
              </p>
            </div>
          </div>
        )}

        {/* skills */}
        {mission.skills.length > 0 && (
          <div className="mt-8 rise rise-5">
            <div className="text-eyebrow text-parchment/40 mb-3">Required skills</div>
            <div className="flex flex-wrap gap-2">
              {mission.skills.map(s => (
                <span
                  key={s}
                  className="px-3 py-1 border border-gold-dim/40 text-gold-dim text-xs tracking-widest uppercase font-mono"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* claimant */}
        {claimant && claimantAv && (
          <div className="mt-10 rise rise-5">
            <div className="text-eyebrow text-gold mb-3">Claimed by</div>
            <div className="panel p-6 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg shrink-0 border border-ink/40"
                style={{ backgroundColor: claimantAv.color }}
              >
                {claimantAv.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/${claimant.handle}`} className="font-display text-xl text-parchment hover:text-gold transition-colors">
                  {claimant.name}
                </Link>
                <div className="font-mono text-xs text-parchment/50">@{claimant.handle}</div>
                {claimant.tagline && (
                  <div className="text-sm italic text-parchment/55 mt-1">&ldquo;{claimant.tagline}&rdquo;</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* delivery */}
        {mission.deliveryNote && (
          <div className="mt-10 rise rise-6">
            <div className="text-eyebrow text-gold mb-3">Delivery note</div>
            <div className="panel p-8 border-l-2 border-l-gold/70">
              <p className="text-parchment/80 whitespace-pre-wrap leading-relaxed font-body text-base md:text-lg first-letter:font-display first-letter:text-4xl first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-gold-dim first-letter:italic">
                {mission.deliveryNote}
              </p>
            </div>
          </div>
        )}

        {/* actions */}
        <div className="mt-12 rise rise-6">
          <CommissionActions mission={mission} />
        </div>
      </div>
    </main>
  );
}
