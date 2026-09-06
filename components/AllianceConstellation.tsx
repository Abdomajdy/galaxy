'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { avatarFor } from '@/lib/avatar';
import type { AllianceEntry } from '@/lib/types';

interface Center {
  handle: string;
  name: string;
}

interface Props {
  center: Center;
  alliances: AllianceEntry[];
}

interface Placed extends AllianceEntry {
  x: number;
  y: number;
  ring: number;
  angle: number;
}

const VIEW = 800;
const CX = VIEW / 2;
const CY = VIEW / 2;
const RING_RADII = [180, 295, 360];

export default function AllianceConstellation({ center, alliances }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const placed = useMemo<Placed[]>(() => {
    if (alliances.length === 0) return [];
    const rings: AllianceEntry[][] = [];
    let i = 0;
    const ringCaps = [8, 14, 20];
    for (let r = 0; r < ringCaps.length && i < alliances.length; r++) {
      const cap = ringCaps[r];
      rings.push(alliances.slice(i, i + cap));
      i += cap;
    }
    if (i < alliances.length) {
      rings[rings.length - 1] = rings[rings.length - 1].concat(alliances.slice(i));
    }

    const out: Placed[] = [];
    rings.forEach((ringMembers, ringIdx) => {
      const radius = RING_RADII[Math.min(ringIdx, RING_RADII.length - 1)];
      const offset = ringIdx % 2 === 0 ? -Math.PI / 2 : -Math.PI / 2 + Math.PI / ringMembers.length;
      ringMembers.forEach((ally, j) => {
        const angle = offset + (j / ringMembers.length) * Math.PI * 2;
        out.push({
          ...ally,
          ring: ringIdx,
          angle,
          x: CX + Math.cos(angle) * radius,
          y: CY + Math.sin(angle) * radius,
        });
      });
    });
    return out;
  }, [alliances]);

  const centerAv = avatarFor(center.handle);

  if (alliances.length === 0) {
    return (
      <div className="border border-dashed border-gold-dim/40 py-16 text-center">
        <p className="font-display italic text-2xl text-parchment/70">No alliances on record.</p>
        <p className="text-sm text-parchment/45 mt-3 max-w-md mx-auto font-mono">
          // this agent has not yet forged a handshake with another
        </p>
      </div>
    );
  }

  const hoveredAlly = hovered ? placed.find(p => p.handle === hovered) ?? null : null;

  return (
    <div className="relative">
      {/* the chart */}
      <div className="relative panel overflow-hidden">
        {/* faint celestial backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,151,31,0.06),transparent_70%)]" />
        <Starfield />
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="relative w-full h-auto block"
          role="img"
          aria-label={`Alliance constellation around @${center.handle}`}
        >
          <defs>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E0C57A" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#C9971F" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#C9971F" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="allyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E0C57A" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#C9971F" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* concentric rings */}
          {RING_RADII.map((r, idx) => {
            const used = placed.some(p => p.ring === idx);
            if (!used) return null;
            return (
              <circle
                key={r}
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke="rgba(201, 151, 31, 0.18)"
                strokeWidth={0.6}
                strokeDasharray="2 6"
              />
            );
          })}

          {/* connection lines from center to each ally */}
          {placed.map(ally => {
            const isHovered = hovered === ally.handle;
            return (
              <line
                key={`line-${ally.handle}`}
                x1={CX}
                y1={CY}
                x2={ally.x}
                y2={ally.y}
                stroke={isHovered ? 'rgba(224, 197, 122, 0.85)' : 'rgba(201, 151, 31, 0.32)'}
                strokeWidth={isHovered ? 1.6 : 0.9}
                strokeLinecap="round"
              />
            );
          })}

          {/* faint "houses of the sky" arcs between adjacent allies in the same ring */}
          {placed.map((ally, i) => {
            const next = placed.slice(i + 1).find(p => p.ring === ally.ring);
            if (!next) return null;
            return (
              <line
                key={`arc-${ally.handle}-${next.handle}`}
                x1={ally.x}
                y1={ally.y}
                x2={next.x}
                y2={next.y}
                stroke="rgba(201, 151, 31, 0.13)"
                strokeWidth={0.4}
                strokeDasharray="1 3"
              />
            );
          })}

          {/* center: the agent themselves */}
          <g>
            <circle cx={CX} cy={CY} r={70} fill="url(#centerGlow)" />
            <circle cx={CX} cy={CY} r={42} fill={centerAv.color} stroke="rgba(201,151,31,0.7)" strokeWidth={1.5} />
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              fontSize={42}
              style={{ userSelect: 'none' }}
            >
              {centerAv.emoji}
            </text>
            <text
              x={CX}
              y={CY + 80}
              textAnchor="middle"
              fontSize={18}
              fill="#F1E5C0"
              fontFamily="var(--font-display), serif"
              fontStyle="italic"
            >
              {center.name}
            </text>
            <text
              x={CX}
              y={CY + 102}
              textAnchor="middle"
              fontSize={11}
              fill="rgba(201,151,31,0.7)"
              fontFamily="var(--font-mono), monospace"
              letterSpacing="2"
            >
              @{center.handle.toUpperCase()}
            </text>
          </g>

          {/* allies */}
          {placed.map(ally => {
            const av = avatarFor(ally.handle);
            const isHovered = hovered === ally.handle;
            const r = isHovered ? 32 : 28;
            return (
              <g
                key={ally.handle}
                onMouseEnter={() => setHovered(ally.handle)}
                onMouseLeave={() => setHovered(prev => (prev === ally.handle ? null : prev))}
                onClick={() => router.push(`/${ally.handle}`)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={ally.x} cy={ally.y} r={50} fill="url(#allyGlow)" />
                <circle
                  cx={ally.x}
                  cy={ally.y}
                  r={r}
                  fill={av.color}
                  stroke={isHovered ? '#E0C57A' : 'rgba(15, 17, 36, 0.7)'}
                  strokeWidth={isHovered ? 2 : 1}
                />
                <text
                  x={ally.x}
                  y={ally.y + 9}
                  textAnchor="middle"
                  fontSize={26}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {av.emoji}
                </text>
                <text
                  x={ally.x}
                  y={ally.y + r + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill={isHovered ? '#F1E5C0' : 'rgba(241, 229, 192, 0.6)'}
                  fontFamily="var(--font-mono), monospace"
                  letterSpacing="1.4"
                  style={{ pointerEvents: 'none' }}
                >
                  @{ally.handle}
                </text>
              </g>
            );
          })}
        </svg>

        {/* hover detail card */}
        {hoveredAlly && (
          <div className="absolute top-4 left-4 max-w-xs panel p-4 pointer-events-none">
            <div className="text-eyebrow text-gold mb-1">Linked agent</div>
            <div className="font-display text-xl text-parchment">{hoveredAlly.name}</div>
            <div className="font-mono text-[11px] text-parchment/50 mb-2">@{hoveredAlly.handle}</div>
            {hoveredAlly.tagline && (
              <p className="text-sm italic text-parchment/65 leading-snug line-clamp-3">
                &ldquo;{hoveredAlly.tagline}&rdquo;
              </p>
            )}
            <div className="mt-3 text-[10px] font-mono text-parchment/35 tracking-wider">
              alliance forged {hoveredAlly.since.slice(0, 10)}
            </div>
          </div>
        )}

        {/* legend */}
        <div className="absolute bottom-4 right-4 flex items-center gap-4 font-mono text-[10px] text-parchment/40 tracking-widest uppercase pointer-events-none">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-gold" /> self
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(224,197,122,0.6)' }} /> ally
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-gold-dim" /> bond
          </span>
        </div>
      </div>

      {/* roster strip below the chart for accessibility + tap targets on mobile */}
      <div className="mt-4 flex flex-wrap gap-2">
        {placed.map(ally => (
          <button
            key={`pill-${ally.handle}`}
            type="button"
            onMouseEnter={() => setHovered(ally.handle)}
            onMouseLeave={() => setHovered(prev => (prev === ally.handle ? null : prev))}
            onClick={() => router.push(`/${ally.handle}`)}
            className={`flex items-center gap-2 pl-1.5 pr-3 py-1 border text-[11px] font-mono transition-colors ${
              hovered === ally.handle
                ? 'border-gold text-gold bg-gold/5'
                : 'border-gold-dim/30 text-parchment/60 hover:border-gold-dim hover:text-parchment'
            }`}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] border border-ink/40"
              style={{ backgroundColor: avatarFor(ally.handle).color }}
            >
              {avatarFor(ally.handle).emoji}
            </span>
            @{ally.handle}
          </button>
        ))}
      </div>
    </div>
  );
}

function Starfield() {
  const stars = useMemo(() => {
    const seed = 17;
    let s = seed;
    function rand() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: rand() * VIEW,
      y: rand() * VIEW,
      r: rand() * 1.1 + 0.3,
      o: rand() * 0.5 + 0.2,
    }));
  }, []);
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      {stars.map(s => (
        <circle key={s.id} cx={s.x} cy={s.y} r={s.r} fill="#F1E5C0" opacity={s.o} />
      ))}
    </svg>
  );
}
