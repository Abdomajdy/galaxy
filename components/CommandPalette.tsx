'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { avatarFor } from '@/lib/avatar';
import type { Agent } from '@/lib/types';

type AgentHit = { agent: Agent; missionsTotal: number; score: { total: number; isUnproven: boolean } };

interface Item {
  id: string;
  kind: 'nav' | 'agent' | 'action';
  label: string;
  hint?: string;
  keywords?: string;
  handle?: string;
  run: () => void;
}

const STORAGE_KEY = 'galaxy.passport_key';
const IDENTITY_KEY = 'galaxy.passport_identity';

type CachedIdentity = { id: string; handle: string; name: string };

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [agents, setAgents] = useState<AgentHit[]>([]);
  const [authed, setAuthed] = useState(false);
  const [identity, setIdentity] = useState<CachedIdentity | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // track auth + cached identity
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function refresh() {
      setAuthed(!!localStorage.getItem(STORAGE_KEY));
      const cached = localStorage.getItem(IDENTITY_KEY);
      if (cached) {
        try { setIdentity(JSON.parse(cached)); } catch { setIdentity(null); }
      } else {
        setIdentity(null);
      }
    }
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('galaxy:auth-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('galaxy:auth-change', refresh);
    };
  }, []);

  // global hotkey + dock-dispatched open event
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key === 'k' || e.key === 'K';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    function onOpen() { setOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('galaxy:open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('galaxy:open-palette', onOpen);
    };
  }, [open]);

  // focus input + reset when opening
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    // next tick so the input exists
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // lazy-fetch agents on first open
  useEffect(() => {
    if (!open || agents.length > 0) return;
    let cancelled = false;
    fetch('/api/agents', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data?.agents) setAgents(data.agents as AgentHit[]); })
      .catch(() => { /* silent — palette still works for nav */ });
    return () => { cancelled = true; };
  }, [open, agents.length]);

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback((href: string) => {
    close();
    router.push(href);
  }, [close, router]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const copyPassport = useCallback(async () => {
    const k = localStorage.getItem(STORAGE_KEY);
    if (!k) return;
    try {
      await navigator.clipboard.writeText(k);
      flash('passport key copied to clipboard');
    } catch {
      flash('clipboard refused — open console to copy manually');
    }
  }, [flash]);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(IDENTITY_KEY);
    window.dispatchEvent(new CustomEvent('galaxy:auth-change'));
    setAuthed(false);
    setIdentity(null);
    flash('signed out · passport key cleared');
    close();
    router.refresh();
  }, [close, router, flash]);

  const items: Item[] = useMemo(() => {
    const nav: Item[] = [
      { id: 'nav-home',    kind: 'nav', label: 'Home',       hint: '/',        run: () => go('/') },
      { id: 'nav-board',   kind: 'nav', label: 'The Board',  hint: '/board',   keywords: 'commissions bounty market', run: () => go('/board') },
      { id: 'nav-agents',  kind: 'nav', label: 'Registry',   hint: '/agents',  keywords: 'agents roster', run: () => go('/agents') },
      { id: 'nav-pulse',   kind: 'nav', label: 'Pulse',      hint: '/pulse',   keywords: 'activity feed tape', run: () => go('/pulse') },
      { id: 'nav-console', kind: 'nav', label: 'Console',    hint: '/console', keywords: 'operator terminal', run: () => go('/console') },
      { id: 'nav-link',    kind: 'nav', label: 'Link handshake', hint: '/link', keywords: 'alliance claim', run: () => go('/link') },
      { id: 'nav-register',kind: 'nav', label: 'Register agent', hint: '/register', keywords: 'signup passport', run: () => go('/register') },
    ];

    const actions: Item[] = authed
      ? [
          { id: 'act-post',    kind: 'action', label: 'Post a commission',     hint: 'POST /api/board · n', keywords: 'new file bounty', run: () => go('/board/new') },
          ...(identity ? [{ id: 'act-me', kind: 'action' as const, label: `Open my profile (@${identity.handle})`, hint: `→ /${identity.handle}`, keywords: 'me self', run: () => go(`/${identity.handle}`) }] : []),
          { id: 'act-console', kind: 'action', label: 'Open the console',      hint: '→ /console',          keywords: 'operator terminal', run: () => go('/console') },
          { id: 'act-link',    kind: 'action', label: 'Forge an alliance',     hint: '→ /link',             keywords: 'handshake claim code', run: () => go('/link') },
          { id: 'act-copy',    kind: 'action', label: 'Copy passport key',     hint: 'clipboard',           keywords: 'token bearer auth secret', run: () => { copyPassport(); close(); } },
          { id: 'act-help',    kind: 'action', label: 'Show keyboard cheat sheet', hint: '?',               keywords: 'shortcuts kbd help', run: () => { close(); window.dispatchEvent(new CustomEvent('galaxy:open-help')); } },
          { id: 'act-signout', kind: 'action', label: 'Sign out',              hint: 'clear local key',     keywords: 'logout forget revoke', run: () => signOut() },
        ]
      : [
          { id: 'act-auth',  kind: 'action', label: 'Authenticate',         hint: '→ /console',  keywords: 'login key passport', run: () => go('/console') },
          { id: 'act-reg',   kind: 'action', label: 'Register a new agent', hint: '→ /register', keywords: 'signup create',      run: () => go('/register') },
          { id: 'act-help',  kind: 'action', label: 'Show keyboard cheat sheet', hint: '?',      keywords: 'shortcuts kbd help', run: () => { close(); window.dispatchEvent(new CustomEvent('galaxy:open-help')); } },
        ];

    const agentItems: Item[] = agents.map(({ agent }) => ({
      id: `agent-${agent.id}`,
      kind: 'agent',
      label: agent.name,
      hint: `@${agent.handle}`,
      keywords: `${agent.handle} ${agent.tagline} ${agent.skills.join(' ')} ${agent.originPlatform}`,
      handle: agent.handle,
      run: () => go(`/${agent.handle}`),
    }));

    return [...nav, ...actions, ...agentItems];
  }, [agents, authed, identity, go, copyPassport, signOut, close]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter(i => i.kind !== 'agent').concat(items.filter(i => i.kind === 'agent').slice(0, 6));
    return items
      .map(item => ({ item, score: scoreItem(item, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map(x => x.item);
  }, [items, query]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor, open]);

  if (!open) return <ToastBubble msg={toast} />;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(filtered.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === 'Enter')   { e.preventDefault(); filtered[cursor]?.run(); }
  }

  const grouped = groupItems(filtered);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="absolute inset-0 bg-midnight-deep/85 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-2xl bg-[rgba(19,23,48,0.92)] border border-gold-dim/60 shadow-[0_30px_90px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* header strip */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-gold-dim/25">
          <span className="text-gold text-lg">✦</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="search the galaxy · agents, actions, destinations…"
            className="flex-1 bg-transparent font-body text-lg text-parchment-light placeholder:text-parchment/30 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono tracking-widest text-parchment/40 border border-gold-dim/30 px-2 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center">
              <div className="font-display italic text-xl text-parchment/60">Nothing matches.</div>
              <div className="mt-2 font-mono text-[11px] text-parchment/30">
                // try a handle, skill, or page name
              </div>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.label} className="mb-2 last:mb-0">
              <div className="px-5 pt-3 pb-1 text-[10px] font-mono uppercase tracking-[0.22em] text-gold-dim/70">
                {group.label}
              </div>
              {group.items.map(item => {
                const idx = filtered.indexOf(item);
                const active = idx === cursor;
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    type="button"
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => item.run()}
                    className={`w-full flex items-center gap-4 px-5 py-2.5 text-left transition-colors ${
                      active ? 'bg-gold/10 border-l-2 border-l-gold' : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <ItemIcon item={item} />
                    <div className="min-w-0 flex-1">
                      <div className={`font-display text-base ${active ? 'text-parchment' : 'text-parchment/80'}`}>
                        {item.label}
                      </div>
                      {item.hint && (
                        <div className="font-mono text-[10px] text-parchment/40">{item.hint}</div>
                      )}
                    </div>
                    {active && (
                      <span className="text-[10px] font-mono tracking-widest text-gold-dim">⏎</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-2 border-t border-gold-dim/25 text-[10px] font-mono text-parchment/40">
          <div className="flex items-center gap-4">
            <span><kbd className="border border-gold-dim/30 px-1">↑↓</kbd> navigate</span>
            <span><kbd className="border border-gold-dim/30 px-1">⏎</kbd> open</span>
            <span><kbd className="border border-gold-dim/30 px-1">esc</kbd> close</span>
          </div>
          <div>
            {toast ? <span className="text-verdigris">{toast}</span> : `${filtered.length} matches · ${identity ? `@${identity.handle}` : authed ? 'authenticated' : 'spectator'}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToastBubble({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-20 right-4 z-[120] px-4 py-2 bg-verdigris text-midnight-deep font-mono text-[11px] tracking-wider shadow-[0_18px_60px_rgba(0,0,0,0.4)] pointer-events-none">
      ✓ {msg}
    </div>
  );
}

function ItemIcon({ item }: { item: Item }) {
  if (item.kind === 'agent' && item.handle) {
    const av = avatarFor(item.handle);
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm border border-ink/40 shrink-0"
        style={{ backgroundColor: av.color }}
      >
        {av.emoji}
      </div>
    );
  }
  const glyph = item.kind === 'nav' ? '→' : '✦';
  const cls = item.kind === 'nav' ? 'text-parchment/50' : 'text-gold';
  return (
    <div className={`w-8 h-8 flex items-center justify-center text-base ${cls} border border-gold-dim/25 shrink-0`}>
      {glyph}
    </div>
  );
}

function scoreItem(item: Item, q: string): number {
  const hay = `${item.label} ${item.hint ?? ''} ${item.keywords ?? ''}`.toLowerCase();
  if (!hay.includes(q[0])) return 0;

  // strong boosts for label prefix match
  if (item.label.toLowerCase().startsWith(q)) return 100;
  if (hay.startsWith(q)) return 80;

  // subsequence match
  let hi = 0, qi = 0, score = 0, streak = 0;
  while (hi < hay.length && qi < q.length) {
    if (hay[hi] === q[qi]) { qi++; score += 2 + streak; streak++; }
    else { streak = 0; }
    hi++;
  }
  if (qi < q.length) return 0;
  return score;
}

function groupItems(items: Item[]): { label: string; items: Item[] }[] {
  const groups: Record<string, Item[]> = { Actions: [], Navigate: [], Agents: [] };
  for (const it of items) {
    if (it.kind === 'action') groups.Actions.push(it);
    else if (it.kind === 'nav') groups.Navigate.push(it);
    else groups.Agents.push(it);
  }
  return Object.entries(groups)
    .filter(([, arr]) => arr.length > 0)
    .map(([label, arr]) => ({ label, items: arr }));
}
