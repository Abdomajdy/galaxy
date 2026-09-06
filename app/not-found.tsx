import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-celestial flex items-center justify-center overflow-hidden">
      {/* corner coordinates */}
      <div className="pointer-events-none select-none absolute top-6 left-6 text-eyebrow text-gold-dim">
        ∞° · ∞′
      </div>
      <div className="pointer-events-none select-none absolute top-6 right-6 text-eyebrow text-gold-dim">
        UNCHARTED
      </div>
      <div className="pointer-events-none select-none absolute bottom-6 left-6 text-eyebrow text-gold-dim">
        FOL. —
      </div>
      <div className="pointer-events-none select-none absolute bottom-6 right-6 text-eyebrow text-gold-dim">
        ERR. CDIV
      </div>

      <div className="relative z-10 text-center px-6 max-w-xl">
        {/* drifting seal */}
        <div className="flex justify-center mb-10 rise rise-1">
          <div className="wax-seal drift !w-24 !h-24 text-3xl font-display italic">
            ✦
          </div>
        </div>

        <div className="divider-celestial text-eyebrow max-w-[16rem] mx-auto mb-6 rise rise-2">
          <span>Error · CDIV</span>
        </div>

        <h1 className="text-display-l text-parchment rise rise-3">
          Lost in the{' '}
          <span className="italic text-gold-bright">galaxy.</span>
        </h1>

        <p className="mt-6 text-parchment/65 text-lg leading-relaxed rise rise-4">
          The star you seek does not appear in this atlas.<br />
          Perhaps it was never charted — or has since drifted from the sky.
        </p>

        {/* constellation divider */}
        <div className="mt-10 flex items-center gap-4 text-gold-dim rise rise-5">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
          <svg width="48" height="12" viewBox="0 0 48 12" className="text-gold">
            <circle cx="3"  cy="6" r="1.5" fill="currentColor" />
            <line x1="3"  y1="6" x2="16" y2="3" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
            <circle cx="16" cy="3" r="2" fill="currentColor" />
            <line x1="16" y1="3" x2="32" y2="9" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
            <circle cx="32" cy="9" r="1.5" fill="currentColor" />
            <line x1="32" y1="9" x2="45" y2="4" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
            <circle cx="45" cy="4" r="1.8" fill="currentColor" />
          </svg>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dim to-transparent" />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5 rise rise-6">
          <Link
            href="/agents"
            className="inline-flex items-center gap-3 px-6 py-3 bg-gold text-midnight-deep font-display text-base tracking-wide hover:bg-gold-bright transition-colors"
          >
            <span>Consult the registry</span>
            <span className="text-lg">→</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-3 px-6 py-3 border border-parchment/30 text-parchment hover:border-gold hover:text-gold transition-colors font-display text-base tracking-wide"
          >
            <span>Return to port</span>
          </Link>
        </div>

        <div className="mt-14 text-[10px] font-mono tracking-[0.22em] uppercase text-parchment/30">
          filed under the open sky
        </div>
      </div>
    </main>
  );
}
