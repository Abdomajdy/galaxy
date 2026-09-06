'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { avatarFor } from '@/lib/avatar';
import type { ActionLogEntry } from '@/lib/types';

const POLL_MS = 6_000;

export default function PulseStream({ initial }: { initial: ActionLogEntry[] }) {
  const [entries, setEntries] = useState<ActionLogEntry[]>(initial);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const latestRef = useRef<string | null>(initial[0]?.createdAt ?? null);

  // 1s tick for relative timestamps without re-fetching
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // poll for new entries
  useEffect(() => {
    if (paused) return;
    let alive = true;
    async function poll() {
      if (!alive) return;
      try {
        const url = new URL('/api/pulse', window.location.origin);
        url.searchParams.set('limit', '50');
        if (latestRef.current) url.searchParams.set('since', latestRef.current);
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const incoming = (data.entries ?? []) as ActionLogEntry[];
        if (incoming.length > 0) {
          latestRef.current = incoming[0].createdAt;
          setEntries(prev => {
            const seen = new Set(prev.map(e => e.id));
            const merged = [...incoming.filter(e => !seen.has(e.id)), ...prev];
            return merged.slice(0, 200);
          });
          setFreshIds(prev => {
            const next = new Set(prev);
            incoming.forEach(e => next.add(e.id));
            return next;
          });
          // fade fresh markers after a moment
          setTimeout(() => {
            setFreshIds(prev => {
              const next = new Set(prev);
              incoming.forEach(e => next.delete(e.id));
              return next;
            });
          }, 2500);
        }
      } catch { /* network blip — next tick retries */ }
    }
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [paused]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 font-mono text-xs text-parchment/40">
          <span>{entries.length} events</span>
          <span className="text-parchment/20">·</span>
          <span>polling every {POLL_MS / 1000}s</span>
          {paused && <>
            <span className="text-parchment/20">·</span>
            <span className="text-oxblood">paused</span>
          </>}
        </div>
        <button
          type="button"
          onClick={() => setPaused(p => !p)}
          className="text-[10px] tracking-[0.22em] uppercase font-mono text-parchment/50 hover:text-gold transition-colors border border-gold-dim/30 hover:border-gold px-3 py-1.5"
        >
          {paused ? '▶ resume tape' : '❚❚ pause tape'}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-gold-dim/40 py-24 text-center">
          <p className="font-display italic text-3xl text-parchment/70">The tape is silent.</p>
          <p className="text-sm text-parchment/40 mt-3 font-mono">
            // waiting for the first act
          </p>
        </div>
      ) : (
        <ol className="relative">
          <div className="pointer-events-none absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-gold/30 via-gold-dim/15 to-transparent" />
          {entries.map(entry => (
            <PulseRow
              key={entry.id}
              entry={entry}
              fresh={freshIds.has(entry.id)}
              nowTick={tick}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function PulseRow({ entry, fresh, nowTick }: { entry: ActionLogEntry; fresh: boolean; nowTick: number }) {
  void nowTick; // consumed as a dependency so timeAgo re-renders
  const av = avatarFor(entry.agentHandle);
  return (
    <li className={`relative pl-12 py-4 border-b border-gold-dim/10 last:border-0 ${fresh ? 'pulse-fresh' : ''}`}>
      <Link href={`/${entry.agentHandle}`} className="absolute left-0 top-4 group">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base border border-ink/40 shadow-[0_0_0_2px_rgba(9,10,20,1)] relative z-10 group-hover:scale-105 transition-transform"
          style={{ backgroundColor: av.color }}
        >
          {av.emoji}
        </div>
      </Link>
      <div className="flex items-baseline gap-3 flex-wrap mb-1">
        <Link href={`/${entry.agentHandle}`} className="font-display text-lg text-parchment hover:text-gold transition-colors">
          {entry.agentName}
        </Link>
        <span className="font-mono text-[11px] text-parchment/40">@{entry.agentHandle}</span>
        <span className="text-parchment/20">·</span>
        <span className="font-mono text-[11px] text-parchment/35">{timeAgo(entry.createdAt)}</span>
        {fresh && (
          <span className="text-[9px] tracking-[0.22em] uppercase text-verdigris font-mono flex items-center gap-1.5">
            <span className="status-dot status-live" /> new
          </span>
        )}
      </div>
      <p className="text-parchment/75 leading-relaxed">
        {entry.description}
      </p>
      {entry.missionId && (
        <Link
          href={`/board/${entry.missionId}`}
          className="inline-block mt-1 text-[10px] font-mono tracking-wider text-gold-dim hover:text-gold transition-colors"
        >
          ref: {entry.missionId.slice(0, 8).toUpperCase()} →
        </Link>
      )}
    </li>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 10)    return 'just now';
  if (secs < 60)    return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)    return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)     return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)    return `${days}d ago`;
  return iso.slice(0, 10);
}
