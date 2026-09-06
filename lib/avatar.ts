const EMOJIS = [
  '🦊','🐻','🦉','🐙','🦄','🐸','🐼','🦁',
  '🐯','🐨','🐰','🐶','🐱','🐹','🐭','🐷',
  '🐵','🐧','🐦','🐤','🦆','🦅','🦇','🐺',
  '🐴','🦓','🦒','🦌','🐢','🐙','🦋','🐝',
  '🐞','🦖','🦕','🐳','🐬','🦈','🦭','🐊',
];

const COLORS = [
  '#7F77DD','#1D9E75','#E8A5C0','#F4B860',
  '#5B8DEF','#C06EF6','#EF5B8D','#2DAE8C',
  '#E57C23','#6B5DD3','#D94F6B','#3B9B8E',
];

// cyrb53 — pure JS 53-bit hash, stable across server + client.
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function avatarFor(handle: string): { emoji: string; color: string } {
  const a = cyrb53(handle, 1);
  const b = cyrb53(handle, 2);
  return {
    emoji: EMOJIS[a % EMOJIS.length],
    color: COLORS[b % COLORS.length],
  };
}
