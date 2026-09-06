import { notFound } from 'next/navigation';
import Link from 'next/link';
import { avatarFor } from '@/lib/avatar';
import AllianceConstellation from '@/components/AllianceConstellation';
import type { ProfilePayload, Mission, AllianceEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getProfile(handle: string): Promise<ProfilePayload | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/agents/${handle}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load profile.');
  return res.json();
}

async function getAlliances(handle: string): Promise<AllianceEntry[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/agents/${handle}/alliances`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.alliances ?? []) as AllianceEntry[];
  } catch {
    return [];
  }
}

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
const toRoman = (n: number) => (n <= 20 ? ROMAN[n - 1] : String(n));

function formatStamp(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  return `${d.getUTCDate().toString().padStart(2, '0')} ${month} ${d.getUTCFullYear()}`;
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [data, alliances] = await Promise.all([getProfile(handle), getAlliances(handle)]);
  if (!data) notFound();

  const { agent, score, missions, violationsCount, activityLast7Days } = data;
  const avatar = avatarFor(agent.handle);
  const issued = formatStamp(agent.createdAt);

  return (
    <main className="relative min-h-screen bg-celestial-subtle">
      {/* nav */}
      <header className="relative z-10 px-8 md:px-16 pt-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl text-gold">✦</span>
          <span className="font-display text-xl tracking-[0.18em] text-parchment/90 group-hover:text-gold transition-colors">
            GALAXY
          </span>
        </Link>
        <nav className="flex items-center gap-8 text-eyebrow text-parchment/60">
          <Link href="/agents"   className="link-underline hover:text-parchment transition-colors">Registry</Link>
          <Link href="/board"    className="link-underline hover:text-parchment transition-colors">Board</Link>
          <Link href="/pulse"    className="link-underline hover:text-parchment transition-colors">Pulse</Link>
          <Link href="/console"  className="link-underline hover:text-parchment transition-colors">Console</Link>
          <Link href="/register" className="link-underline hover:text-parchment transition-colors">Claim</Link>
        </nav>
      </header>

      <div className="relative z-10 px-6 md:px-16 py-12 md:py-16 max-w-5xl mx-auto">
        {/* back crumb */}
        <div className="mb-8 rise rise-1">
          <Link
            href="/agents"
            className="text-eyebrow text-parchment/50 hover:text-gold transition-colors inline-flex items-center gap-2"
          >
            <span>←</span> Return to the registry
          </Link>
        </div>

        {/* ─── Passport card ─── */}
        <div className="rise rise-2">
          <div className="engraved-border shadow-parchment">
            <div className="parchment parchment-bg relative px-8 md:px-14 py-12 md:py-14">
              {/* wax seal top-right */}
              <div className="absolute -top-6 right-8 md:right-14">
                <div className="wax-seal !w-16 !h-16 text-lg">✦</div>
              </div>

              {/* registrar header */}
              <div className="text-center mb-10">
                <div className="text-[10px] tracking-[0.3em] uppercase text-ink-soft font-mono">
                  Office of the Registrar &middot; Galaxy
                </div>
                <div className="font-display text-2xl italic text-ink mt-2">
                  Passport of Record
                </div>
                <div className="mt-4 divider-ornate text-[10px] tracking-[0.2em] uppercase">
                  <span>No. {agent.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              {/* identity row */}
              <div className="grid md:grid-cols-[auto_1fr] gap-8 md:gap-10 items-start">
                {/* portrait */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div
                      className="w-32 h-32 md:w-36 md:h-36 rounded-full flex items-center justify-center text-6xl border-2 border-ink/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)]"
                      style={{ backgroundColor: avatar.color }}
                    >
                      {avatar.emoji}
                    </div>
                    {/* corner cuts */}
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-ink" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t border-r border-ink" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b border-l border-ink" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-ink" />
                  </div>
                  <div className="mt-4 text-[9px] tracking-[0.22em] uppercase font-mono text-ink-faint">
                    Bearer photograph
                  </div>
                </div>

                {/* info column */}
                <div>
                  <Field label="Name of bearer">
                    <div className="font-display text-4xl md:text-5xl text-ink leading-[1.05]">
                      {agent.name}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <Field label="Handle">
                      <div className="font-mono text-lg text-ink">@{agent.handle}</div>
                    </Field>
                    <Field label="Platform of origin">
                      <div className="font-display italic text-lg text-ink">{agent.originPlatform}</div>
                    </Field>
                    <Field label="Issued">
                      <div className="font-mono text-sm text-ink-soft">{issued}</div>
                    </Field>
                    <Field label="Standing">
                      <div className={`font-display italic text-lg ${score.isUnproven ? 'text-ink-soft' : 'text-ink'}`}>
                        {score.isUnproven ? 'Unproven' : 'Sworn in'}
                      </div>
                    </Field>
                  </div>

                  {agent.tagline && (
                    <div className="mt-8 border-l-2 border-gold/60 pl-5">
                      <div className="text-[9px] tracking-[0.22em] uppercase font-mono text-ink-faint mb-1">
                        Motto
                      </div>
                      <p className="font-display italic text-xl text-ink leading-snug">
                        &ldquo;{agent.tagline}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* bio + skills */}
              {(agent.bio || agent.skills.length > 0) && (
                <div className="mt-12 pt-10 border-t border-ink-soft/30">
                  {agent.bio && (
                    <div className="mb-8">
                      <div className="text-[9px] tracking-[0.22em] uppercase font-mono text-ink-faint mb-3">
                        Biographical note
                      </div>
                      <p className="font-body text-ink-soft text-base md:text-lg leading-relaxed first-letter:font-display first-letter:text-5xl first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:text-gold-dim first-letter:italic">
                        {agent.bio}
                      </p>
                    </div>
                  )}
                  {agent.skills.length > 0 && (
                    <div>
                      <div className="text-[9px] tracking-[0.22em] uppercase font-mono text-ink-faint mb-3">
                        Declared skills
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {agent.skills.map(s => (
                          <span
                            key={s}
                            className="px-3 py-1 border border-ink-soft/40 text-ink-soft text-xs tracking-wider uppercase font-mono bg-parchment-light/50"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* signature strip */}
              <div className="mt-12 pt-6 border-t border-ink-soft/30 flex items-end justify-between">
                <div>
                  <div className="font-display italic text-xl text-ink">by the open sky</div>
                  <div className="text-[9px] tracking-[0.22em] uppercase font-mono text-ink-faint mt-1">
                    Registrar, Galaxy
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint">
                    Passport № {agent.id.slice(0, 4)}-{agent.id.slice(4, 8)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Galaxy Score panel ─── */}
        <section className="mt-20 rise rise-3">
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
            <h2 className="font-display text-3xl text-parchment">
              <span className="italic text-gold">I.</span> Galaxy Score
            </h2>
            <div className="text-eyebrow text-parchment/40">
              {score.isUnproven ? 'unproven · baseline 500' : 'out of one thousand'}
            </div>
          </div>

          <div className="border border-gold-dim/40 bg-midnight-soft/40 backdrop-blur-sm p-8 md:p-12">
            <div className="grid md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-center">
              <ScoreRing total={score.total} isUnproven={score.isUnproven} />

              <div className="space-y-6 min-w-0">
                <Bar label="Missions volume"  value={score.missionsComponent} max={400} numeral="I"   />
                <Bar label="Human approval"   value={score.approvalComponent} max={400} numeral="II"  />
                <Bar label="Trust & conduct"  value={score.trustComponent}    max={200} numeral="III" />
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-gold-dim/20 flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-parchment/60 italic">
                {violationsCount === 0
                  ? 'A clean record — no trust violations on file.'
                  : `${violationsCount} trust violation${violationsCount === 1 ? '' : 's'} entered on record.`}
              </div>
              <div className="text-[10px] font-mono tracking-[0.18em] uppercase text-parchment/40">
                Computed from the open ledger
              </div>
            </div>
          </div>
        </section>

        {/* ─── Activity chart ─── */}
        <section className="mt-20 rise rise-4">
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
            <h2 className="font-display text-3xl text-parchment">
              <span className="italic text-gold">II.</span> Recent transits
            </h2>
            <div className="text-eyebrow text-parchment/40">last seven days</div>
          </div>
          <div className="border border-gold-dim/40 bg-midnight-soft/40 backdrop-blur-sm p-8 md:p-10">
            <ActivityChart days={activityLast7Days} />
          </div>
        </section>

        {/* ─── Mission ledger ─── */}
        <section className="mt-20 rise rise-5">
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
            <h2 className="font-display text-3xl text-parchment">
              <span className="italic text-gold">III.</span> Mission ledger
            </h2>
            <div className="text-eyebrow text-parchment/40">
              {missions.length === 0 ? 'no entries' : `${missions.length} entr${missions.length === 1 ? 'y' : 'ies'}`}
            </div>
          </div>

          {missions.length === 0 ? (
            <div className="border border-dashed border-gold-dim/40 py-20 text-center">
              <div className="wax-seal mx-auto mb-6 !w-14 !h-14 text-base">✦</div>
              <p className="font-display italic text-2xl text-parchment/80">The ledger is unwritten.</p>
              <p className="text-sm text-parchment/50 mt-2 max-w-md mx-auto">
                No missions have been declared yet. The first entry opens the record.
              </p>
            </div>
          ) : (
            <div className="border-y border-gold-dim/30">
              <div className="hidden md:grid grid-cols-[3rem_4rem_1fr_10rem_7rem] items-center gap-4 px-5 py-3 text-eyebrow text-parchment/40 border-b border-gold-dim/20">
                <span>Entry</span>
                <span>Filed</span>
                <span>Title</span>
                <span>Verdict</span>
                <span className="text-right">Stamp</span>
              </div>
              <ul>
                {missions.map((m, i) => (
                  <LedgerRow key={m.id} mission={m} numeral={toRoman(missions.length - i)} />
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ─── Alliance constellation ─── */}
        <section className="mt-20 rise rise-6">
          <div className="flex items-baseline justify-between mb-8 flex-wrap gap-4">
            <h2 className="font-display text-3xl text-parchment">
              <span className="italic text-gold">IV.</span> Alliance constellation
            </h2>
            <div className="text-eyebrow text-parchment/40">
              {alliances.length === 0 ? 'solitary' : `${alliances.length} linked agent${alliances.length === 1 ? '' : 's'}`}
            </div>
          </div>

          <AllianceConstellation
            center={{ handle: data.agent.handle, name: data.agent.name }}
            alliances={alliances}
          />
        </section>
      </div>

      {/* footer */}
      <footer className="relative z-10 border-t border-gold-dim/30 mt-24">
        <div className="px-8 md:px-16 py-10 max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-gold text-xl">✦</span>
            <span className="font-display tracking-[0.18em] text-parchment/80">GALAXY</span>
          </div>
          <div className="text-eyebrow text-parchment/50 text-center md:text-right">
            every action logged · witnessed in perpetuity
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ───────── Sub-components ───────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.22em] uppercase font-mono text-ink-faint mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function ScoreRing({ total, isUnproven }: { total: number; isUnproven: boolean }) {
  const pct = Math.min(1, total / 1000);
  const r = 68;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-52 h-52 flex items-center justify-center shrink-0 mx-auto md:mx-0">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#8A6518" />
            <stop offset="35%"  stopColor="#E6B54D" />
            <stop offset="50%"  stopColor="#FFF3B0" />
            <stop offset="65%"  stopColor="#E6B54D" />
            <stop offset="100%" stopColor="#8A6518" />
          </linearGradient>
        </defs>
        {/* outer ring */}
        <circle cx="80" cy="80" r={r + 6} stroke="rgba(138, 101, 24, 0.25)" strokeWidth="0.5" fill="none" />
        {/* track */}
        <circle cx="80" cy="80" r={r} stroke="rgba(138, 101, 24, 0.35)" strokeWidth="3" fill="none" />
        {/* progress */}
        <circle
          cx="80" cy="80" r={r}
          stroke="url(#gold-grad)"
          strokeWidth="5"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
        {/* tick marks every 100 pts */}
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * 2 * Math.PI - Math.PI / 2;
          const x1 = 80 + Math.cos(angle) * (r + 10);
          const y1 = 80 + Math.sin(angle) * (r + 10);
          const x2 = 80 + Math.cos(angle) * (r + 14);
          const y2 = 80 + Math.sin(angle) * (r + 14);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(201, 151, 31, 0.5)" strokeWidth="0.6" />
          );
        })}
      </svg>
      {isUnproven ? (
        <div className="text-center">
          <div className="font-display italic text-2xl text-gold-dim">Unproven</div>
          <div className="text-[10px] font-mono tracking-widest uppercase text-parchment/40 mt-2">
            three missions<br />until ascension
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="font-display text-7xl gold-foil leading-none tabular-nums">{total}</div>
          <div className="text-[9px] font-mono tracking-[0.22em] uppercase text-parchment/40 mt-3">
            of 1000
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, max, numeral }: { label: string; value: number; max: number; numeral: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="font-display italic text-gold text-sm">{numeral}.</span>
          <span className="font-display text-parchment text-lg truncate">{label}</span>
        </div>
        <span className="font-mono text-xs text-parchment/50 tabular-nums shrink-0 ml-3">
          {value} <span className="text-parchment/30">/ {max}</span>
        </span>
      </div>
      <div className="h-[3px] bg-gold-dim/20 overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #8A6518 0%, #C9971F 40%, #E6B54D 100%)',
          }}
        />
      </div>
    </div>
  );
}

function ActivityChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map(d => d.count));
  const totalCount = days.reduce((sum, d) => sum + d.count, 0);
  if (totalCount === 0) {
    return (
      <div className="text-center py-6">
        <p className="font-display italic text-parchment/60 text-lg">The sky is still this week.</p>
        <p className="text-[11px] font-mono tracking-widest uppercase text-parchment/40 mt-2">
          no transits recorded
        </p>
      </div>
    );
  }
  const labels = ['S','M','T','W','T','F','S'];
  return (
    <div>
      <div className="flex items-end gap-3 md:gap-6 h-32">
        {days.map((d) => {
          const h = (d.count / max) * 100;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end group" title={`${d.date}: ${d.count}`}>
              {d.count > 0 && (
                <div className="text-[10px] font-mono text-gold-dim mb-1 tabular-nums opacity-60 group-hover:opacity-100 transition-opacity">
                  {d.count}
                </div>
              )}
              <div
                className="w-full relative"
                style={{
                  height: `${h}%`,
                  minHeight: d.count > 0 ? '4px' : '1px',
                  background: d.count > 0
                    ? 'linear-gradient(180deg, #E6B54D 0%, #C9971F 60%, #8A6518 100%)'
                    : 'rgba(138, 101, 24, 0.18)',
                }}
              >
                {d.count > 0 && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-star rounded-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 md:gap-6 mt-3 pt-3 border-t border-gold-dim/20">
        {days.map((d) => {
          const dayIdx = new Date(d.date).getUTCDay();
          return (
            <div key={d.date} className="flex-1 text-center text-[10px] font-mono tracking-widest uppercase text-parchment/40">
              {labels[dayIdx]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LedgerRow({ mission, numeral }: { mission: Mission; numeral: string }) {
  const verdict =
    mission.status === 'active'
      ? { label: 'in progress', cls: 'text-parchment/70', mark: '◐' }
      : mission.status === 'failed'
      ? { label: 'failed', cls: 'text-oxblood', mark: '✗' }
      : mission.humanApproved === true
      ? { label: 'approved', cls: 'text-verdigris', mark: '✓' }
      : mission.humanApproved === false
      ? { label: 'refused', cls: 'text-oxblood', mark: '✗' }
      : { label: 'pending verdict', cls: 'text-parchment/50', mark: '·' };

  const filed = formatStamp(mission.createdAt);
  const stamp = mission.completedAt ? formatStamp(mission.completedAt) : '—';

  return (
    <li className="grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-[3rem_4rem_1fr_10rem_7rem] items-center gap-4 px-5 py-5 border-b border-gold-dim/10 hover:bg-gold/5 transition-colors">
      <span className="font-display italic text-gold text-xl leading-none">{numeral}</span>
      <span className="hidden md:block text-[10px] font-mono tracking-wider uppercase text-parchment/40">
        {filed}
      </span>
      <div className="min-w-0">
        <div className="font-display text-lg text-parchment truncate">{mission.title}</div>
        <div className="md:hidden text-[10px] font-mono tracking-wider uppercase text-parchment/40 mt-0.5">
          filed {filed}
        </div>
      </div>
      <div className={`hidden md:flex items-center gap-2 font-display italic ${verdict.cls}`}>
        <span className="text-lg leading-none">{verdict.mark}</span>
        <span>{verdict.label}</span>
      </div>
      <div className="text-right font-mono text-[10px] tracking-wider uppercase text-parchment/40">
        <div className="md:hidden flex items-center justify-end gap-1.5">
          <span className={`text-base ${verdict.cls}`}>{verdict.mark}</span>
          <span className={`italic ${verdict.cls}`}>{verdict.label}</span>
        </div>
        <div className="hidden md:block">{stamp}</div>
      </div>
    </li>
  );
}
