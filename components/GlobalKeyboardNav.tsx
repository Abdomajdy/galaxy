'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const NAV_MAP: Record<string, { href: string; label: string }> = {
  h: { href: '/',         label: 'Home' },
  a: { href: '/agents',   label: 'Registry' },
  b: { href: '/board',    label: 'Board' },
  p: { href: '/pulse',    label: 'Pulse' },
  c: { href: '/console',  label: 'Console' },
  r: { href: '/register', label: 'Register' },
  l: { href: '/link',     label: 'Link handshake' },
};

export default function GlobalKeyboardNav() {
  const router = useRouter();
  const [leader, setLeader] = useState(false);
  const [help, setHelp] = useState(false);
  const leaderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function isTyping(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
      return false;
    }

    function clearLeader() {
      setLeader(false);
      if (leaderTimerRef.current !== null) {
        window.clearTimeout(leaderTimerRef.current);
        leaderTimerRef.current = null;
      }
    }

    function onKey(e: KeyboardEvent) {
      // help can be opened/closed with `?` even from typing? no — respect input fields
      if (e.key === 'Escape' && help) { e.preventDefault(); setHelp(false); return; }
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // help toggle
      if (e.key === '?') { e.preventDefault(); setHelp(h => !h); return; }

      // leader g + letter
      if (leader) {
        const key = e.key.toLowerCase();
        const target = NAV_MAP[key];
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        clearLeader();
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setLeader(true);
        leaderTimerRef.current = window.setTimeout(() => setLeader(false), 1400);
        return;
      }

      // single-key shortcut: n → new commission
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        router.push('/board/new');
        return;
      }
    }

    function onOpenHelp() { setHelp(true); }

    window.addEventListener('keydown', onKey);
    window.addEventListener('galaxy:open-help', onOpenHelp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('galaxy:open-help', onOpenHelp);
      if (leaderTimerRef.current !== null) window.clearTimeout(leaderTimerRef.current);
    };
  }, [leader, help, router]);

  return (
    <>
      {leader && <LeaderHint />}
      {help && <HelpOverlay onClose={() => setHelp(false)} />}
    </>
  );
}

function LeaderHint() {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[105] pointer-events-none">
      <div className="px-4 py-2 bg-gold text-midnight-deep font-mono text-[11px] tracking-[0.22em] uppercase shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex items-center gap-2">
        <kbd className="bg-midnight-deep/20 border border-midnight-deep/30 px-1.5 py-0.5">g</kbd>
        <span>then a key · h a b p c r l</span>
      </div>
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-midnight-deep/85 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[rgba(19,23,48,0.95)] border border-gold-dim/60 shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <div className="px-6 py-5 border-b border-gold-dim/25 flex items-start justify-between">
          <div>
            <div className="text-eyebrow text-gold">Cheat sheet</div>
            <div className="font-display text-3xl text-parchment mt-1">Keyboard ceremony</div>
            <div className="text-[11px] font-mono text-parchment/40 mt-1.5">// shortcuts ignore input fields</div>
          </div>
          <kbd className="text-[10px] font-mono tracking-widest text-parchment/40 border border-gold-dim/30 px-2 py-0.5">ESC</kbd>
        </div>
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-2 px-6 py-6">
          <Group label="Navigate">
            {Object.entries(NAV_MAP).map(([key, { label }]) => (
              <Row key={key} keys={['g', key]} label={label} />
            ))}
          </Group>
          <Group label="Actions">
            <Row keys={['n']}      label="New commission" />
            <Row keys={['⌘', 'K']} label="Command palette" />
            <Row keys={['?']}      label="This cheat sheet" />
            <Row keys={['Esc']}    label="Close any overlay" />
          </Group>
        </div>
        <div className="px-6 py-3 border-t border-gold-dim/25 flex items-center justify-between text-[10px] font-mono text-parchment/40">
          <span>// vim-style leader · 1.4s window after pressing g</span>
          <span>v.0.5</span>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-gold-dim/70 pb-2 mb-3 border-b border-gold-dim/15">
        {label}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between font-mono text-[12px]">
      <span className="text-parchment/70">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd key={i} className="border border-gold-dim/40 bg-midnight-soft/60 px-1.5 py-0.5 text-[10px] text-gold-dim min-w-[1.2rem] text-center">
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}
