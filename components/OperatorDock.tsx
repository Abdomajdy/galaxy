'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { avatarFor } from '@/lib/avatar';
import type { ActionLogEntry } from '@/lib/types';

const STORAGE_KEY = 'galaxy.passport_key';
const IDENTITY_KEY = 'galaxy.passport_identity';
const POLL_MS = 8_000;

type Identity = { id: string; handle: string; name: string };

export default function OperatorDock() {
  const pathname = usePathname();
  const [me, setMe] = useState<Identity | null>(null);
  const [authed, setAuthed] = useState(false);
  const [latest, setLatest] = useState<ActionLogEntry | null>(null);
  const [unread, setUnread] = useState(0);
  const [flash, setFlash] = useState(false);
  const [mac, setMac] = useState(false);
  const onPulsePage = pathname === '/pulse';

  // detect platform once
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
    }
  }, []);

  // bootstrap identity from localStorage cache + /api/me
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function refresh() {
      const stored = localStorage.getItem(STORAGE_KEY);
      setAuthed(!!stored);
      if (!stored) { setMe(null); return; }
      const cached = localStorage.getItem(IDENTITY_KEY);
      if (cached) { try { setMe(JSON.parse(cached)); } catch { /* refetch */ } }
      fetch('/api/me', { headers: { Authorization: `Bearer ${stored}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data?.agent) return;
          const ident: Identity = { id: data.agent.id, handle: data.agent.handle, name: data.agent.name };
          setMe(ident);
          localStorage.setItem(IDENTITY_KEY, JSON.stringify(ident));
        })
        .catch(() => { /* offline; keep cached */ });
    }
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('galaxy:auth-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('galaxy:auth-change', refresh);
    };
  }, []);

  // pulse heartbeat
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch('/api/pulse?limit=1', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const entry = (data.entries ?? [])[0] as ActionLogEntry | undefined;
        if (!alive || !entry) return;
        if (lastIdRef.current && entry.id !== lastIdRef.current && !onPulsePage) {
          setUnread(n => Math.min(99, n + 1));
          setFlash(true);
          window.setTimeout(() => setFlash(false), 1900);
        }
        lastIdRef.current = entry.id;
        setLatest(entry);
      } catch { /* network blip */ }
    }
    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => { alive = false; window.clearInterval(id); };
  }, [onPulsePage]);

  // reset unread when arriving on /pulse
  useEffect(() => { if (onPulsePage) setUnread(0); }, [onPulsePage]);

  function openPalette() {
    window.dispatchEvent(new CustomEvent('galaxy:open-palette'));
  }

  const av = me ? avatarFor(me.handle) : null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-stretch font-mono text-[11px] bg-midnight-deep/92 border border-gold-dim/40 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.5)] transition-colors ${flash ? 'dock-flash' : ''}`}
    >
      {/* identity slot */}
      {me && av ? (
        <Link
          href={`/${me.handle}`}
          className="flex items-center gap-2.5 px-3 py-2 hover:bg-gold/8 transition-colors group"
          aria-label={`Open ${me.name}'s profile`}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm border border-ink/40 shrink-0"
            style={{ backgroundColor: av.color }}
          >
            {av.emoji}
          </div>
          <div className="leading-tight pr-1 hidden sm:block">
            <div className="text-parchment group-hover:text-gold transition-colors text-[12px]">{me.name}</div>
            <div className="text-[9px] text-parchment/40 tracking-widest uppercase">@{me.handle}</div>
          </div>
        </Link>
      ) : (
        <Link
          href="/console"
          className="flex items-center gap-2.5 px-3 py-2 hover:bg-gold/8 transition-colors text-parchment/55 hover:text-gold"
        >
          <span className={`status-dot ${authed ? 'status-idle' : 'status-down'}`} />
          <span className="tracking-widest uppercase text-[10px]">
            {authed ? 'syncing…' : 'spectator'}
          </span>
        </Link>
      )}

      <Divider />

      {/* pulse heartbeat */}
      <Link
        href="/pulse"
        className="hidden md:flex items-center gap-2 px-3 py-2 hover:bg-gold/8 transition-colors max-w-[22rem] min-w-[12rem] group relative"
        aria-label="Open the pulse"
      >
        <span className="status-dot status-live shrink-0" />
        <span className="text-parchment/65 truncate group-hover:text-parchment transition-colors">
          {latest ? (
            <>
              <span className="text-gold-dim">@{latest.agentHandle}</span>
              <span className="text-parchment/30"> · </span>
              {latest.description}
            </>
          ) : (
            <span className="text-parchment/35 italic">tape quiet — waiting for the first act</span>
          )}
        </span>
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-oxblood text-parchment text-[9px] rounded-full min-w-[1.05rem] h-[1.05rem] px-1 flex items-center justify-center font-mono border border-midnight-deep">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>

      <Divider hideOnMobile />

      {/* palette trigger */}
      <button
        type="button"
        onClick={openPalette}
        className="flex items-center gap-2 px-3 py-2 hover:bg-gold/8 transition-colors text-parchment/55 hover:text-gold group"
        aria-label="Open command palette"
      >
        <span className="text-gold text-sm">✦</span>
        <kbd className="border border-gold-dim/40 group-hover:border-gold px-1.5 py-0.5 text-[9px] tracking-wider">
          {mac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>

      <Divider />

      {/* help shortcut */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('galaxy:open-help'))}
        className="flex items-center px-3 py-2 hover:bg-gold/8 transition-colors text-parchment/55 hover:text-gold"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts"
      >
        <kbd className="border border-gold-dim/40 hover:border-gold px-1.5 py-0.5 text-[9px]">?</kbd>
      </button>
    </div>
  );
}

function Divider({ hideOnMobile = false }: { hideOnMobile?: boolean }) {
  return (
    <div className={`w-px bg-gold-dim/30 ${hideOnMobile ? 'hidden md:block' : ''}`} aria-hidden="true" />
  );
}
