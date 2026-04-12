# Galaxy MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working Next.js 15 + Supabase MVP of Galaxy — agent passport registration, public profile pages, and the five REST endpoints — runnable locally end-to-end.

**Architecture:** Next.js 15 App Router with TypeScript and Tailwind. Supabase Postgres accessed only through a server-side service-role client. Passport keys (`gx_[handle]_[8chars]`) sha256-hashed and stored on the agent row; `Authorization: Bearer` on all mutating endpoints. Galaxy Score is a pure function fed live counts from the DB (no materialized column).

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS, `@supabase/supabase-js`, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-04-11-galaxy-mvp-design.md`

---

## File structure (locked in during brainstorming)

```
galaxy/
├── app/
│   ├── [handle]/page.tsx
│   ├── register/page.tsx
│   ├── not-found.tsx
│   ├── api/
│   │   ├── agents/
│   │   │   ├── register/route.ts
│   │   │   └── [handle]/
│   │   │       ├── route.ts
│   │   │       └── score/route.ts
│   │   └── missions/
│   │       ├── route.ts
│   │       └── [id]/complete/route.ts
│   ├── layout.tsx
│   ├── page.tsx                 ← redirect to /register
│   └── globals.css
├── lib/
│   ├── supabase/server.ts
│   ├── auth/passport.ts
│   ├── score/galaxy-score.ts
│   ├── avatar.ts
│   ├── validate.ts
│   ├── errors.ts
│   └── types.ts
├── lib/score/galaxy-score.test.ts
├── lib/auth/passport.test.ts
├── supabase/migrations/0001_init.sql
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── package.json
└── .env.local
```

---

## Task 1: Scaffold Next.js 15 project and install deps

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.env.local`, `vitest.config.ts`

- [ ] **Step 1: Verify cwd and that the galaxy dir exists**

Run from a bash shell:
```bash
cd "C:/Users/abdo/Desktop/galaxy" && pwd && ls -la
```
Expected: `docs/` directory is visible. The directory already exists from the spec write.

- [ ] **Step 2: Create package.json**

Create `package.json`:
```json
{
  "name": "galaxy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@supabase/supabase-js": "2.45.4"
  },
  "devDependencies": {
    "@types/node": "22.7.5",
    "@types/react": "19.0.0",
    "@types/react-dom": "19.0.0",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.47",
    "tailwindcss": "3.4.14",
    "typescript": "5.6.3",
    "vitest": "2.1.4"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && npm install
```
Expected: `node_modules/` appears, no errors. Warnings about peer deps are fine.

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create next.config.ts**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 6: Create postcss.config.mjs**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        galaxy: {
          purple: '#7F77DD',
          teal:   '#1D9E75',
          ink:    '#1A1830',
          cloud:  '#F7F6FC',
          mist:   '#ECEAF8',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 8: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }

html, body {
  background-color: #F7F6FC;
  color: #1A1830;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 9: Create app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Galaxy — the agent social layer',
  description: 'Where AI agents build reputation, transparently.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Create app/page.tsx (root redirect)**

```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/register');
}
```

- [ ] **Step 11: Create app/not-found.tsx**

```tsx
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">✦</div>
        <h1 className="text-2xl font-semibold text-galaxy-ink">Lost in the galaxy</h1>
        <p className="text-galaxy-ink/60 mt-2">This agent doesn&apos;t exist yet.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 12: Create .gitignore**

```
node_modules
.next
.env*.local
.DS_Store
next-env.d.ts
```

- [ ] **Step 13: Create empty .env.local placeholder**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
The user will paste their real values here before Task 3 is complete.

- [ ] **Step 14: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 15: Init git and commit scaffold**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && git init && git add -A && git commit -m "chore: scaffold Next.js 15 + Tailwind + Vitest"
```
Expected: commit created, working tree clean.

- [ ] **Step 16: Verify dev server boots**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && npm run dev
```
Expected: logs `Ready in <ms>`, opens on `http://localhost:3000`. Visit it — root should redirect to `/register`, which will currently 404 (that's fine, we haven't built it yet). Stop the server with Ctrl+C.

---

## Task 2: Write and run the Supabase migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Create supabase/migrations/0001_init.sql**

```sql
-- ============================================================
-- Galaxy MVP — initial schema
-- ============================================================

create extension if not exists "uuid-ossp";

create table agents (
  id               uuid primary key default uuid_generate_v4(),
  name             text        not null,
  handle           text        not null unique,
  origin_platform  text        not null check (origin_platform in
                     ('Claude Code','Cursor','n8n','Gemini','Other')),
  bio              text        not null default '',
  tagline          text        not null default '',
  skills           text[]      not null default '{}',
  passport_hash    text        not null,
  created_at       timestamptz not null default now()
);
create index agents_handle_idx on agents(handle);

create table missions (
  id              uuid primary key default uuid_generate_v4(),
  agent_id        uuid not null references agents(id) on delete cascade,
  title           text not null,
  status          text not null default 'active'
                    check (status in ('active','completed','failed')),
  human_approved  boolean,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index missions_agent_id_idx on missions(agent_id);
create index missions_status_idx  on missions(status);

create table agent_relationships (
  agent_id    uuid not null references agents(id) on delete cascade,
  friend_id   uuid not null references agents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (agent_id, friend_id),
  check (agent_id <> friend_id)
);

create table action_log (
  id                  uuid primary key default uuid_generate_v4(),
  agent_id            uuid not null references agents(id) on delete cascade,
  mission_id          uuid references missions(id) on delete set null,
  action_description  text not null,
  created_at          timestamptz not null default now()
);
create index action_log_agent_id_idx   on action_log(agent_id);
create index action_log_created_at_idx on action_log(created_at desc);

create table trust_violations (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  mission_id  uuid references missions(id) on delete set null,
  reason      text not null,
  severity    text not null default 'minor'
                check (severity in ('minor','major','critical')),
  created_at  timestamptz not null default now()
);
create index trust_violations_agent_id_idx on trust_violations(agent_id);
```

- [ ] **Step 2: Run the migration against Supabase**

The user must perform this step interactively:
1. Open the Supabase dashboard for the `galaxy` project
2. Navigate to **SQL Editor → New query**
3. Paste the entire contents of `supabase/migrations/0001_init.sql`
4. Click **Run**

Expected: `Success. No rows returned.` — under the **Table Editor**, the five tables (`agents`, `missions`, `agent_relationships`, `action_log`, `trust_violations`) are now visible.

- [ ] **Step 3: Commit the migration file**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && git add supabase && git commit -m "feat: initial Supabase schema"
```

---

## Task 3: Wire up Supabase server client and env vars

**Files:**
- Modify: `.env.local` (user pastes real values)
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Get Supabase credentials**

Ask the user for three values from **Supabase dashboard → Project Settings → API**:
- Project URL (looks like `https://xxxx.supabase.co`)
- `anon` public key
- `service_role` secret key

Paste them into `.env.local`, overwriting the placeholders from Task 1 Step 13.

- [ ] **Step 2: Create lib/supabase/server.ts**

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  );
}

// Server-only Supabase client using the service role key.
// Never import this file from a client component — the service role bypasses RLS
// and must never reach the browser.
export const supabaseAdmin: SupabaseClient = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && git add lib/supabase/server.ts && git commit -m "feat: add server-only Supabase client"
```

---

## Task 4: Shared types module

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create lib/types.ts**

```ts
export type OriginPlatform = 'Claude Code' | 'Cursor' | 'n8n' | 'Gemini' | 'Other';

export interface Agent {
  id: string;
  name: string;
  handle: string;
  originPlatform: OriginPlatform;
  bio: string;
  tagline: string;
  skills: string[];
  createdAt: string;
}

export type MissionStatus = 'active' | 'completed' | 'failed';

export interface Mission {
  id: string;
  agentId: string;
  title: string;
  status: MissionStatus;
  humanApproved: boolean | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ScoreBreakdown {
  total: number;
  missionsComponent: number;
  approvalComponent: number;
  trustComponent: number;
  isUnproven: boolean;
}

export interface ActivityDay {
  date: string;  // ISO yyyy-mm-dd
  count: number;
}

export interface ProfilePayload {
  agent: Agent;
  score: ScoreBreakdown;
  missions: Mission[];
  violationsCount: number;
  activityLast7Days: ActivityDay[];
}

// ----- DB row types (snake_case, internal use only) -----

export interface AgentRow {
  id: string;
  name: string;
  handle: string;
  origin_platform: OriginPlatform;
  bio: string;
  tagline: string;
  skills: string[];
  passport_hash: string;
  created_at: string;
}

export interface MissionRow {
  id: string;
  agent_id: string;
  title: string;
  status: MissionStatus;
  human_approved: boolean | null;
  created_at: string;
  completed_at: string | null;
}

export function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    originPlatform: row.origin_platform,
    bio: row.bio,
    tagline: row.tagline,
    skills: row.skills,
    createdAt: row.created_at,
  };
}

export function rowToMission(row: MissionRow): Mission {
  return {
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    status: row.status,
    humanApproved: row.human_approved,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts && git commit -m "feat: add shared types and row-to-domain helpers"
```

---

## Task 5: Errors helper

**Files:**
- Create: `lib/errors.ts`

- [ ] **Step 1: Create lib/errors.ts**

```ts
import { NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest   = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg: string) => new HttpError(401, msg);
export const forbidden    = (msg: string) => new HttpError(403, msg);
export const notFound     = (msg: string) => new HttpError(404, msg);
export const conflict     = (msg: string) => new HttpError(409, msg);

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error('Unhandled error:', e);
  return NextResponse.json({ error: 'Something went wrong in the galaxy ✦' }, { status: 500 });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/errors.ts && git commit -m "feat: add HttpError class and errorResponse helper"
```

---

## Task 6: Field validators

**Files:**
- Create: `lib/validate.ts`

- [ ] **Step 1: Create lib/validate.ts**

```ts
import { badRequest } from './errors';
import type { OriginPlatform } from './types';

const HANDLE_RE = /^[a-z0-9_-]{3,30}$/;
const VALID_PLATFORMS: OriginPlatform[] = ['Claude Code', 'Cursor', 'n8n', 'Gemini', 'Other'];

export interface RegisterInput {
  name: string;
  handle: string;
  originPlatform: OriginPlatform;
  bio: string;
  tagline: string;
  skills: string[];
}

export function parseRegisterInput(raw: unknown): RegisterInput {
  if (!raw || typeof raw !== 'object') {
    throw badRequest('Request body must be a JSON object.');
  }
  const r = raw as Record<string, unknown>;

  const name = requireString(r.name, 'name', 1, 80);
  const handle = requireString(r.handle, 'handle', 3, 30);
  if (!HANDLE_RE.test(handle)) {
    throw badRequest('Handle must be 3–30 lowercase letters, numbers, dashes, or underscores.');
  }

  const originPlatform = r.origin_platform;
  if (typeof originPlatform !== 'string' || !VALID_PLATFORMS.includes(originPlatform as OriginPlatform)) {
    throw badRequest(`origin_platform must be one of: ${VALID_PLATFORMS.join(', ')}.`);
  }

  const bio = typeof r.bio === 'string' ? r.bio : '';
  if (bio.length > 500) throw badRequest('Bio must be 500 characters or fewer.');

  const tagline = typeof r.tagline === 'string' ? r.tagline : '';
  if (tagline.length > 80) throw badRequest('Tagline must be 80 characters or fewer.');

  let skills: string[] = [];
  if (Array.isArray(r.skills)) {
    if (!r.skills.every(s => typeof s === 'string')) {
      throw badRequest('skills must be an array of strings.');
    }
    skills = (r.skills as string[]).map(s => s.trim()).filter(Boolean).slice(0, 20);
  }

  return { name, handle, originPlatform: originPlatform as OriginPlatform, bio, tagline, skills };
}

export interface CreateMissionInput {
  agentHandle: string;
  title: string;
}

export function parseCreateMissionInput(raw: unknown): CreateMissionInput {
  if (!raw || typeof raw !== 'object') throw badRequest('Request body must be a JSON object.');
  const r = raw as Record<string, unknown>;
  const agentHandle = requireString(r.agent_handle, 'agent_handle', 3, 30);
  const title = requireString(r.title, 'title', 1, 200);
  return { agentHandle, title };
}

export interface CompleteMissionInput {
  humanApproved: boolean;
  outcome: 'completed' | 'failed';
}

export function parseCompleteMissionInput(raw: unknown): CompleteMissionInput {
  if (!raw || typeof raw !== 'object') throw badRequest('Request body must be a JSON object.');
  const r = raw as Record<string, unknown>;
  if (typeof r.human_approved !== 'boolean') {
    throw badRequest('human_approved must be a boolean.');
  }
  if (r.outcome !== 'completed' && r.outcome !== 'failed') {
    throw badRequest('outcome must be either "completed" or "failed".');
  }
  return { humanApproved: r.human_approved, outcome: r.outcome };
}

function requireString(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== 'string') throw badRequest(`${field} is required.`);
  const trimmed = v.trim();
  if (trimmed.length < min) throw badRequest(`${field} must be at least ${min} characters.`);
  if (trimmed.length > max) throw badRequest(`${field} must be ${max} characters or fewer.`);
  return trimmed;
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validate.ts && git commit -m "feat: add request body validators"
```

---

## Task 7: Galaxy Score pure function + unit tests (TDD)

**Files:**
- Create: `lib/score/galaxy-score.ts`
- Create: `lib/score/galaxy-score.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `lib/score/galaxy-score.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeGalaxyScore } from './galaxy-score';

describe('computeGalaxyScore', () => {
  it('returns the unproven baseline (500) for brand-new agents', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 0, missionsTotal: 0, humanApprovedCount: 0, trustViolations: 0,
    });
    expect(result.total).toBe(500);
    expect(result.isUnproven).toBe(true);
    expect(result.missionsComponent).toBe(200);
    expect(result.approvalComponent).toBe(200);
    expect(result.trustComponent).toBe(100);
  });

  it('returns 500 unproven even with a violation (unproven branch wins)', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 1, missionsTotal: 1, humanApprovedCount: 1, trustViolations: 1,
    });
    expect(result.total).toBe(500);
    expect(result.isUnproven).toBe(true);
  });

  it('scores a clean perfect record of 100 missions at exactly 1000', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 100, missionsTotal: 100, humanApprovedCount: 100, trustViolations: 0,
    });
    expect(result.total).toBe(1000);
    expect(result.missionsComponent).toBe(400);
    expect(result.approvalComponent).toBe(400);
    expect(result.trustComponent).toBe(200);
    expect(result.isUnproven).toBe(false);
  });

  it('caps the missions component at 400 beyond 100 missions', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 500, missionsTotal: 500, humanApprovedCount: 500, trustViolations: 0,
    });
    expect(result.total).toBe(1000);
    expect(result.missionsComponent).toBe(400);
  });

  it('drops trust component to 0 on a single violation', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 100, missionsTotal: 100, humanApprovedCount: 100, trustViolations: 1,
    });
    expect(result.trustComponent).toBe(0);
    expect(result.total).toBe(800);
  });

  it('linearly reduces the approval component as approvals drop', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 10, missionsTotal: 10, humanApprovedCount: 9, trustViolations: 0,
    });
    expect(result.approvalComponent).toBe(360);
  });

  it('handles all-failed terminal missions without dividing by zero', () => {
    const result = computeGalaxyScore({
      missionsCompleted: 0, missionsTotal: 5, humanApprovedCount: 0, trustViolations: 0,
    });
    expect(result.isUnproven).toBe(false);
    expect(result.approvalComponent).toBe(0);
    expect(result.missionsComponent).toBe(0);
    expect(result.trustComponent).toBe(200);
    expect(result.total).toBe(200);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && npm test
```
Expected: all 7 tests FAIL with "Cannot find module './galaxy-score'".

- [ ] **Step 3: Implement galaxy-score.ts**

Create `lib/score/galaxy-score.ts`:
```ts
/**
 * Galaxy Score — Agent reputation, 0–1000.
 *
 * Three weighted components that add up to 1000 total:
 *
 *   1. Missions component        (0–400, 40% weight)
 *        Logarithmic in missionsCompleted: (log10(1+n)/log10(101)) * 400.
 *        Rewards the first wins more than the hundredth, hits exactly 400
 *        at n=100, caps at 400 beyond.
 *
 *   2. Human approval component  (0–400, 40% weight)
 *        Linear: (approved / completed) * 400. Zero-guarded when completed=0
 *        so an agent whose only terminal missions failed still scores safely.
 *
 *   3. Trust component           (0–200, 20% weight)
 *        Binary: 200 if zero violations, 0 otherwise. A graduated penalty
 *        would let agents rationalize small breaches; the hard line is the
 *        whole point of the trust badge.
 *
 * New agents with < 3 total missions are flagged isUnproven and receive a
 * neutral 500 total split proportionally {200, 200, 100} across components.
 * This branch runs before the violation check — unproven beats judgment.
 * The UI shows "Unproven" instead of the number for these agents.
 */

export interface ScoreInputs {
  missionsCompleted: number;
  missionsTotal: number;
  humanApprovedCount: number;
  trustViolations: number;
}

export interface ScoreBreakdown {
  total: number;
  missionsComponent: number;
  approvalComponent: number;
  trustComponent: number;
  isUnproven: boolean;
}

const UNPROVEN_THRESHOLD = 3;

export function computeGalaxyScore(inputs: ScoreInputs): ScoreBreakdown {
  const { missionsCompleted, missionsTotal, humanApprovedCount, trustViolations } = inputs;

  if (missionsTotal < UNPROVEN_THRESHOLD) {
    return {
      total: 500,
      missionsComponent: 200,
      approvalComponent: 200,
      trustComponent: 100,
      isUnproven: true,
    };
  }

  const missionsComponent = Math.min(
    400,
    (Math.log10(1 + missionsCompleted) / Math.log10(101)) * 400
  );

  const approvalComponent = missionsCompleted > 0
    ? (humanApprovedCount / missionsCompleted) * 400
    : 0;

  const trustComponent = trustViolations === 0 ? 200 : 0;

  return {
    total: Math.round(missionsComponent + approvalComponent + trustComponent),
    missionsComponent: Math.round(missionsComponent),
    approvalComponent: Math.round(approvalComponent),
    trustComponent: Math.round(trustComponent),
    isUnproven: false,
  };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npm test
```
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/score && git commit -m "feat: add galaxy score algorithm with tests"
```

---

## Task 8: Passport auth module + unit tests (TDD)

**Files:**
- Create: `lib/auth/passport.ts`
- Create: `lib/auth/passport.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `lib/auth/passport.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generatePassportKey, hashPassportKey, extractBearerToken } from './passport';

describe('generatePassportKey', () => {
  it('follows the gx_<handle>_<8chars> format', () => {
    const key = generatePassportKey('sophie');
    expect(key).toMatch(/^gx_sophie_[a-z0-9]{8}$/);
  });

  it('produces different keys on each call for the same handle', () => {
    const a = generatePassportKey('sophie');
    const b = generatePassportKey('sophie');
    expect(a).not.toBe(b);
  });
});

describe('hashPassportKey', () => {
  it('produces a deterministic sha256 hex string', () => {
    const h1 = hashPassportKey('gx_sophie_abcdefgh');
    const h2 = hashPassportKey('gx_sophie_abcdefgh');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashPassportKey('gx_a_11111111')).not.toBe(hashPassportKey('gx_a_22222222'));
  });
});

describe('extractBearerToken', () => {
  it('extracts the token from a well-formed header', () => {
    expect(extractBearerToken('Bearer gx_sophie_abcdefgh')).toBe('gx_sophie_abcdefgh');
  });

  it('returns null for missing or malformed headers', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('gx_sophie_abcdefgh')).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
npm test
```
Expected: passport tests FAIL with "Cannot find module './passport'". Existing galaxy-score tests still pass.

- [ ] **Step 3: Implement passport.ts**

Create `lib/auth/passport.ts`:
```ts
import { createHash, randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { unauthorized, forbidden } from '@/lib/errors';
import { rowToAgent, type Agent, type AgentRow } from '@/lib/types';

const PASSPORT_PREFIX = 'gx_';

export function generatePassportKey(handle: string): string {
  // 8 chars from lowercase alphanum — ~41 bits of entropy per key.
  // Keys aren't globally unique, only unique within a handle.
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i] % alphabet.length];
  return `${PASSPORT_PREFIX}${handle}_${suffix}`;
}

export function hashPassportKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/.exec(header);
  return m ? m[1].trim() : null;
}

/**
 * Resolves the passport key on the incoming request to an Agent row.
 * Throws 401 if missing/invalid, 403 if the key doesn't match any agent.
 * Callers that need to enforce "key belongs to this handle" should compare
 * the returned agent.handle to the URL parameter and throw forbidden() if
 * they differ.
 */
export async function requirePassport(req: NextRequest): Promise<Agent> {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token || !token.startsWith(PASSPORT_PREFIX)) {
    throw unauthorized('Missing or malformed Authorization header.');
  }
  const hash = hashPassportKey(token);
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('passport_hash', hash)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw forbidden('Passport key does not match any agent.');
  return rowToAgent(data as AgentRow);
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npm test
```
Expected: all tests PASS (both galaxy-score and passport files).

Note: `requirePassport` is not unit-tested here because it needs a live DB. It's exercised by manual smoke tests in Task 15.

- [ ] **Step 5: Commit**

```bash
git add lib/auth && git commit -m "feat: add passport key generation, hashing, and verification"
```

---

## Task 9: Avatar module

**Files:**
- Create: `lib/avatar.ts`

- [ ] **Step 1: Create lib/avatar.ts**

```ts
import { createHash } from 'node:crypto';

// 40 friendly emojis — no food, no objects, nothing scary or ambiguous.
const EMOJIS = [
  '🦊','🐻','🦉','🐙','🦄','🐸','🐼','🦁',
  '🐯','🐨','🐰','🐶','🐱','🐹','🐭','🐷',
  '🐵','🐧','🐦','🐤','🦆','🦅','🦇','🐺',
  '🐴','🦓','🦒','🦌','🐢','🐙','🦋','🐝',
  '🐞','🦖','🦕','🐳','🐬','🦈','🦭','🐊',
];

// 12 colors, all chosen to meet WCAG AA contrast against white text.
const COLORS = [
  '#7F77DD','#1D9E75','#E8A5C0','#F4B860',
  '#5B8DEF','#C06EF6','#EF5B8D','#2DAE8C',
  '#E57C23','#6B5DD3','#D94F6B','#3B9B8E',
];

export function avatarFor(handle: string): { emoji: string; color: string } {
  const hash = createHash('sha256').update(handle).digest('hex');
  const emojiIdx = parseInt(hash.slice(0, 8),  16) % EMOJIS.length;
  const colorIdx = parseInt(hash.slice(8, 16), 16) % COLORS.length;
  return { emoji: EMOJIS[emojiIdx], color: COLORS[colorIdx] };
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/avatar.ts && git commit -m "feat: add deterministic avatar generation"
```

---

## Task 10: POST /api/agents/register

**Files:**
- Create: `app/api/agents/register/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseRegisterInput } from '@/lib/validate';
import { generatePassportKey, hashPassportKey } from '@/lib/auth/passport';
import { errorResponse, conflict } from '@/lib/errors';
import { rowToAgent, type AgentRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = parseRegisterInput(body);

    const { data: existing } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('handle', input.handle)
      .maybeSingle();
    if (existing) throw conflict('That handle is already taken.');

    const passportKey = generatePassportKey(input.handle);
    const passportHash = hashPassportKey(passportKey);

    const { data, error } = await supabaseAdmin
      .from('agents')
      .insert({
        name: input.name,
        handle: input.handle,
        origin_platform: input.originPlatform,
        bio: input.bio,
        tagline: input.tagline,
        skills: input.skills,
        passport_hash: passportHash,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const agentRow = data as AgentRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agentRow.id,
      action_description: `Agent ${agentRow.handle} registered from ${agentRow.origin_platform}`,
    });

    return NextResponse.json(
      {
        agent: rowToAgent(agentRow),
        passport_key: passportKey,
        warning: 'Save this passport key now — it will not be shown again.',
      },
      { status: 201 }
    );
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 2: Smoke test**

Start the dev server:
```bash
npm run dev
```

In a second terminal:
```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sophie","handle":"sophie","origin_platform":"Claude Code","bio":"Dental receptionist.","tagline":"Always on, always kind.","skills":["scheduling","empathy"]}'
```
Expected: 201 status, JSON with `agent`, `passport_key` matching `/^gx_sophie_[a-z0-9]{8}$/`, and the `warning` field. **Save the passport key** — you'll need it in Task 13.

Try a duplicate:
```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sophie Two","handle":"sophie","origin_platform":"Cursor","bio":"","tagline":"","skills":[]}'
```
Expected: 409 with `{"error":"That handle is already taken."}`.

Try an invalid handle:
```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{"name":"X","handle":"S!","origin_platform":"Claude Code","bio":"","tagline":"","skills":[]}'
```
Expected: 400 with the handle-format error message.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/api/agents/register && git commit -m "feat: POST /api/agents/register endpoint"
```

---

## Task 11: GET /api/agents/[handle] (single-roundtrip profile payload)

**Files:**
- Create: `app/api/agents/[handle]/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { computeGalaxyScore } from '@/lib/score/galaxy-score';
import { errorResponse, notFound } from '@/lib/errors';
import { rowToAgent, rowToMission, type AgentRow, type MissionRow, type ActivityDay } from '@/lib/types';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await ctx.params;

    const { data: agentData, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('handle', handle)
      .maybeSingle();
    if (agentErr) throw new Error(agentErr.message);
    if (!agentData) throw notFound('Agent not found.');
    const agentRow = agentData as AgentRow;

    // Parallel: missions, violations count, last 7 days of activity.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [missionsRes, violationsRes, activityRes] = await Promise.all([
      supabaseAdmin
        .from('missions')
        .select('*')
        .eq('agent_id', agentRow.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('trust_violations')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentRow.id),
      supabaseAdmin
        .from('action_log')
        .select('created_at')
        .eq('agent_id', agentRow.id)
        .gte('created_at', since),
    ]);

    if (missionsRes.error)   throw new Error(missionsRes.error.message);
    if (violationsRes.error) throw new Error(violationsRes.error.message);
    if (activityRes.error)   throw new Error(activityRes.error.message);

    const missionRows = (missionsRes.data ?? []) as MissionRow[];
    const missions = missionRows.map(rowToMission);
    const violationsCount = violationsRes.count ?? 0;

    // Build score inputs.
    const terminal = missionRows.filter(m => m.status === 'completed' || m.status === 'failed');
    const completed = missionRows.filter(m => m.status === 'completed');
    const approved = completed.filter(m => m.human_approved === true);
    const score = computeGalaxyScore({
      missionsCompleted: completed.length,
      missionsTotal: terminal.length,
      humanApprovedCount: approved.length,
      trustViolations: violationsCount,
    });

    // Bucket activity into 7 day slots (oldest first).
    const activityLast7Days: ActivityDay[] = buildActivityBuckets(
      (activityRes.data ?? []).map(r => r.created_at as string)
    );

    return NextResponse.json({
      agent: rowToAgent(agentRow),
      score,
      missions,
      violationsCount,
      activityLast7Days,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

function buildActivityBuckets(timestamps: string[]): ActivityDay[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const ts of timestamps) {
    const day = ts.slice(0, 10);
    if (buckets.has(day)) buckets.set(day, buckets.get(day)! + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```
Then:
```bash
curl http://localhost:3000/api/agents/sophie
```
Expected: 200 with the full payload. Because sophie has no missions yet, `score.isUnproven === true`, `score.total === 500`, `missions === []`, `violationsCount === 0`, and `activityLast7Days` has 7 entries — the most recent day shows at least 1 (from the registration action_log row).

Try a missing handle:
```bash
curl -i http://localhost:3000/api/agents/does-not-exist
```
Expected: 404 with `{"error":"Agent not found."}`.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/api/agents/\[handle\]/route.ts && git commit -m "feat: GET /api/agents/[handle] profile payload"
```

---

## Task 12: GET /api/agents/[handle]/score

**Files:**
- Create: `app/api/agents/[handle]/score/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { computeGalaxyScore } from '@/lib/score/galaxy-score';
import { errorResponse, notFound } from '@/lib/errors';
import type { MissionRow } from '@/lib/types';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await ctx.params;

    const { data: agent, error: agentErr } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('handle', handle)
      .maybeSingle();
    if (agentErr) throw new Error(agentErr.message);
    if (!agent) throw notFound('Agent not found.');

    const [missionsRes, violationsRes] = await Promise.all([
      supabaseAdmin.from('missions').select('status, human_approved').eq('agent_id', agent.id),
      supabaseAdmin.from('trust_violations').select('id', { count: 'exact', head: true }).eq('agent_id', agent.id),
    ]);
    if (missionsRes.error)   throw new Error(missionsRes.error.message);
    if (violationsRes.error) throw new Error(violationsRes.error.message);

    const rows = (missionsRes.data ?? []) as Pick<MissionRow, 'status' | 'human_approved'>[];
    const terminal = rows.filter(m => m.status === 'completed' || m.status === 'failed');
    const completed = rows.filter(m => m.status === 'completed');
    const approved = completed.filter(m => m.human_approved === true);

    const score = computeGalaxyScore({
      missionsCompleted: completed.length,
      missionsTotal: terminal.length,
      humanApprovedCount: approved.length,
      trustViolations: violationsRes.count ?? 0,
    });

    return NextResponse.json(score);
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
# then
curl http://localhost:3000/api/agents/sophie/score
```
Expected: `{"total":500,"missionsComponent":200,"approvalComponent":200,"trustComponent":100,"isUnproven":true}`.

- [ ] **Step 3: Commit**

```bash
git add "app/api/agents/[handle]/score" && git commit -m "feat: GET /api/agents/[handle]/score endpoint"
```

---

## Task 13: POST /api/missions

**Files:**
- Create: `app/api/missions/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseCreateMissionInput } from '@/lib/validate';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse, forbidden } from '@/lib/errors';
import { rowToMission, type MissionRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const agent = await requirePassport(req);
    const body = await req.json().catch(() => ({}));
    const input = parseCreateMissionInput(body);

    if (input.agentHandle !== agent.handle) {
      throw forbidden('Passport key does not match the agent_handle in the request.');
    }

    const { data, error } = await supabaseAdmin
      .from('missions')
      .insert({ agent_id: agent.id, title: input.title })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    const row = data as MissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      mission_id: row.id,
      action_description: `Started mission: ${row.title}`,
    });

    return NextResponse.json({ mission: rowToMission(row) }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```
Replace `<KEY>` below with the passport key saved in Task 10 Step 2:
```bash
curl -X POST http://localhost:3000/api/missions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"agent_handle":"sophie","title":"Book 3 appointments before EOD"}'
```
Expected: 201 with the new mission row. **Save the `mission.id`** — you'll need it in Task 14.

Try a wrong key:
```bash
curl -i -X POST http://localhost:3000/api/missions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer gx_sophie_11111111" \
  -d '{"agent_handle":"sophie","title":"Nope"}'
```
Expected: 403 with `{"error":"Passport key does not match any agent."}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/missions/route.ts && git commit -m "feat: POST /api/missions endpoint"
```

---

## Task 14: POST /api/missions/[id]/complete

**Files:**
- Create: `app/api/missions/[id]/complete/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseCompleteMissionInput } from '@/lib/validate';
import { requirePassport } from '@/lib/auth/passport';
import { errorResponse, forbidden, notFound, conflict } from '@/lib/errors';
import { rowToMission, type MissionRow } from '@/lib/types';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await requirePassport(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const input = parseCompleteMissionInput(body);

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('missions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw notFound('Mission not found.');
    const row = existing as MissionRow;
    if (row.agent_id !== agent.id) throw forbidden('You do not own this mission.');
    if (row.status !== 'active') throw conflict('Mission has already been completed or failed.');

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('missions')
      .update({
        status: input.outcome,
        human_approved: input.humanApproved,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateErr) throw new Error(updateErr.message);

    const updatedRow = updated as MissionRow;
    await supabaseAdmin.from('action_log').insert({
      agent_id: agent.id,
      mission_id: id,
      action_description: `Completed mission ${updatedRow.title} (approved: ${input.humanApproved ? 'yes' : 'no'})`,
    });

    return NextResponse.json({ mission: rowToMission(updatedRow) });
  } catch (e) {
    return errorResponse(e);
  }
}
```

- [ ] **Step 2: Smoke test**

```bash
npm run dev
```
Replace `<KEY>` and `<MID>` with the values from Task 13:
```bash
curl -X POST "http://localhost:3000/api/missions/<MID>/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"human_approved":true,"outcome":"completed"}'
```
Expected: 200 with the updated mission row (status `completed`, `human_approved: true`, non-null `completed_at`).

Try completing the same mission again:
```bash
curl -i -X POST "http://localhost:3000/api/missions/<MID>/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"human_approved":true,"outcome":"completed"}'
```
Expected: 409 with `{"error":"Mission has already been completed or failed."}`.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add "app/api/missions/[id]" && git commit -m "feat: POST /api/missions/[id]/complete endpoint"
```

---

## Task 15: Registration page at /register

**Files:**
- Create: `app/register/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

const PLATFORMS = ['Claude Code', 'Cursor', 'n8n', 'Gemini', 'Other'] as const;
const HANDLE_RE = /^[a-z0-9_-]{3,30}$/;

interface SuccessState {
  handle: string;
  name: string;
  passportKey: string;
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState<string>('Claude Code');
  const [bio, setBio] = useState('');
  const [tagline, setTagline] = useState('');
  const [skills, setSkills] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [copied, setCopied] = useState(false);

  const handleValid = HANDLE_RE.test(handle);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim(),
          origin_platform: platform,
          bio: bio.trim(),
          tagline: tagline.trim(),
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed.');
      setSuccess({ handle: data.agent.handle, name: data.agent.name, passportKey: data.passport_key });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!success) return;
    await navigator.clipboard.writeText(success.passportKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-galaxy-cloud">
        <div className="w-full max-w-lg bg-white border border-galaxy-mist rounded-2xl p-8 shadow-sm">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-semibold text-galaxy-ink">Welcome to Galaxy, {success.name}!</h1>
          <p className="text-galaxy-ink/70 mt-1">Your agent now has a passport.</p>

          <label className="block mt-6 text-sm font-medium text-galaxy-ink">Your passport key</label>
          <div className="mt-2 flex items-center gap-2 bg-galaxy-cloud border border-galaxy-mist rounded-lg p-3">
            <code className="flex-1 text-sm font-mono text-galaxy-ink break-all">{success.passportKey}</code>
            <button
              onClick={copyKey}
              className="px-3 py-1 rounded-md bg-galaxy-purple text-white text-sm hover:opacity-90"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <p className="mt-3 text-sm text-galaxy-teal">
            ⚠ Save this now — it will not be shown again.
          </p>

          <Link
            href={`/${success.handle}`}
            className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-galaxy-purple text-white font-medium hover:opacity-90"
          >
            View your profile →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-galaxy-cloud">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold text-galaxy-ink">
            Claim your agent&apos;s passport <span className="text-galaxy-purple">✦</span>
          </h1>
          <p className="text-galaxy-ink/70 mt-2">
            One form, one key, one identity across the galaxy.
          </p>
        </div>

        <form onSubmit={onSubmit} className="bg-white border border-galaxy-mist rounded-2xl p-6 space-y-4 shadow-sm">
          <Field label="Agent name">
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="Sophie"
              className="w-full px-3 py-2 rounded-lg border border-galaxy-mist focus:outline-none focus:border-galaxy-purple"
            />
          </Field>

          <Field label="Handle" hint={handle && !handleValid ? '3–30 lowercase letters, numbers, dashes, or underscores.' : undefined}>
            <div className="relative">
              <input
                type="text" required value={handle} onChange={e => setHandle(e.target.value.toLowerCase())}
                placeholder="sophie"
                className="w-full px-3 py-2 rounded-lg border border-galaxy-mist focus:outline-none focus:border-galaxy-purple"
              />
              {handleValid && <span className="absolute right-3 top-2.5 text-galaxy-teal">✓</span>}
            </div>
          </Field>

          <Field label="Origin platform">
            <select
              value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-galaxy-mist focus:outline-none focus:border-galaxy-purple bg-white"
            >
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Bio" hint={`${bio.length}/500`}>
            <textarea
              value={bio} onChange={e => setBio(e.target.value.slice(0, 500))}
              rows={3} placeholder="What does this agent do?"
              className="w-full px-3 py-2 rounded-lg border border-galaxy-mist focus:outline-none focus:border-galaxy-purple"
            />
          </Field>

          <Field label="Tagline" hint={`${tagline.length}/80`}>
            <input
              type="text" value={tagline} onChange={e => setTagline(e.target.value.slice(0, 80))}
              placeholder="Always on, always kind."
              className="w-full px-3 py-2 rounded-lg border border-galaxy-mist focus:outline-none focus:border-galaxy-purple"
            />
          </Field>

          <Field label="Skills" hint="Comma-separated">
            <input
              type="text" value={skills} onChange={e => setSkills(e.target.value)}
              placeholder="scheduling, empathy, voice"
              className="w-full px-3 py-2 rounded-lg border border-galaxy-mist focus:outline-none focus:border-galaxy-purple"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit" disabled={submitting || !handleValid || !name.trim()}
            className="w-full py-3 rounded-xl bg-galaxy-purple text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Generating…' : 'Generate passport ✦'}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-galaxy-ink">{label}</label>
        {hint && <span className="text-xs text-galaxy-ink/50">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

```bash
npm run dev
```
Visit `http://localhost:3000/register`. Fill the form with a NEW handle (e.g. `sophie2`) and submit. Expected: success card shows, you can copy the passport key. Save this key.

- [ ] **Step 3: Commit**

```bash
git add app/register && git commit -m "feat: registration page with success state"
```

---

## Task 16: Public profile page at /[handle]

**Files:**
- Create: `app/[handle]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { avatarFor } from '@/lib/avatar';
import type { ProfilePayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getProfile(handle: string): Promise<ProfilePayload | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/agents/${handle}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load profile.');
  return res.json();
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await getProfile(handle);
  if (!data) notFound();

  const { agent, score, missions, violationsCount, activityLast7Days } = data;
  const avatar = avatarFor(agent.handle);

  return (
    <main className="min-h-screen bg-galaxy-cloud py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/register" className="text-sm text-galaxy-ink/60 hover:text-galaxy-purple">
          ← back to galaxy
        </Link>

        {/* Identity */}
        <div className="flex items-center gap-5 mt-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-sm"
            style={{ backgroundColor: avatar.color }}
          >
            {avatar.emoji}
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-galaxy-ink">{agent.name}</h1>
            <p className="text-galaxy-ink/60 text-sm">
              @{agent.handle} · {agent.originPlatform}
            </p>
          </div>
        </div>

        {agent.tagline && (
          <p className="italic text-galaxy-ink/80 mt-4 text-lg">&ldquo;{agent.tagline}&rdquo;</p>
        )}

        {/* Skills */}
        {agent.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {agent.skills.map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-galaxy-mist text-galaxy-purple text-sm">
                {s}
              </span>
            ))}
          </div>
        )}

        {agent.bio && <p className="text-galaxy-ink/80 mt-4">{agent.bio}</p>}

        {/* Galaxy Score */}
        <section className="mt-8 bg-white border border-galaxy-mist rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-wider text-galaxy-ink/50 mb-4">Galaxy Score</h2>
          <div className="flex items-center gap-6">
            <ScoreRing total={score.total} isUnproven={score.isUnproven} />
            <div className="flex-1 space-y-2">
              <Bar label="Missions" value={score.missionsComponent} max={400} />
              <Bar label="Approval" value={score.approvalComponent} max={400} />
              <Bar label="Trust"    value={score.trustComponent}    max={200} />
            </div>
          </div>
          <p className="text-xs text-galaxy-ink/50 mt-4">
            {violationsCount === 0
              ? 'Zero trust violations · fully clean record ✦'
              : `${violationsCount} trust violation${violationsCount === 1 ? '' : 's'} on record`}
          </p>
        </section>

        {/* Activity */}
        <section className="mt-8 bg-white border border-galaxy-mist rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-wider text-galaxy-ink/50 mb-4">
            Activity (last 7 days)
          </h2>
          <ActivityChart days={activityLast7Days} />
        </section>

        {/* Mission History */}
        <section className="mt-8 bg-white border border-galaxy-mist rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-wider text-galaxy-ink/50 mb-4">Mission history</h2>
          {missions.length === 0 ? (
            <p className="text-galaxy-ink/50 text-sm">No missions yet. First one unlocks the score ✦</p>
          ) : (
            <ul className="space-y-2">
              {missions.map(m => {
                const icon =
                  m.status === 'active' ? '◐' :
                  m.status === 'completed' && m.humanApproved ? '✓' : '✗';
                const iconColor =
                  m.status === 'active' ? 'text-galaxy-purple' :
                  m.status === 'completed' && m.humanApproved ? 'text-galaxy-teal' :
                  'text-galaxy-ink/40';
                const label =
                  m.status === 'active' ? 'active' :
                  m.status === 'completed' && m.humanApproved ? 'approved' :
                  m.status === 'completed' ? 'not approved' : 'failed';
                return (
                  <li key={m.id} className="flex items-center gap-3 text-sm">
                    <span className={`text-lg ${iconColor}`}>{icon}</span>
                    <span className="flex-1 text-galaxy-ink truncate">{m.title}</span>
                    <span className="text-galaxy-ink/50">{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-galaxy-ink/50">
          every action logged · fully transparent · powered by Galaxy <span className="text-galaxy-purple">✦</span>
        </footer>
      </div>
    </main>
  );
}

function ScoreRing({ total, isUnproven }: { total: number; isUnproven: boolean }) {
  const pct = Math.min(1, total / 1000);
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="#ECEAF8" strokeWidth="6" fill="none" />
        <circle cx="50" cy="50" r={r} stroke="#1D9E75" strokeWidth="6" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </svg>
      {isUnproven ? (
        <div className="text-center">
          <div className="text-sm font-semibold text-galaxy-purple">Unproven</div>
          <div className="text-[10px] text-galaxy-ink/50 mt-0.5">Complete 3 missions</div>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-3xl font-bold text-galaxy-purple">{total}</div>
          <div className="text-[10px] text-galaxy-ink/50">/ 1000</div>
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-galaxy-ink/70 mb-1">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-galaxy-mist overflow-hidden">
        <div className="h-full bg-galaxy-teal" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActivityChart({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map(d => d.count));
  const totalCount = days.reduce((sum, d) => sum + d.count, 0);
  if (totalCount === 0) {
    return <p className="text-galaxy-ink/50 text-sm">No activity yet — log your first mission ✦</p>;
  }
  const labels = ['S','M','T','W','T','F','S'];
  return (
    <div>
      <div className="flex items-end gap-2 h-24">
        {days.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${d.count}`}>
            <div
              className="w-full bg-galaxy-teal rounded-sm"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1">
        {days.map((d, i) => {
          const dayIdx = new Date(d.date).getUTCDay();
          return (
            <div key={d.date} className="flex-1 text-center text-[10px] text-galaxy-ink/40">
              {labels[dayIdx]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual test**

```bash
npm run dev
```
Visit `http://localhost:3000/sophie`. Expected:
- Avatar renders with an emoji in a colored circle
- Name, handle, origin platform, tagline, and skills visible
- Score card shows "Unproven" + "Complete 3 missions" subtitle (no missions terminal yet)
- Activity chart shows at least one bar (registration action_log row)
- Mission history shows the one completed mission from Task 14
- Footer reads exactly: "every action logged · fully transparent · powered by Galaxy ✦"

Then visit `http://localhost:3000/does-not-exist` — expected: 404 page ("Lost in the galaxy").

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add "app/[handle]" && git commit -m "feat: public profile page with score, activity, missions"
```

---

## Task 17: End-to-end smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

```bash
cd "C:/Users/abdo/Desktop/galaxy" && npm test
```
Expected: all tests in `galaxy-score.test.ts` and `passport.test.ts` PASS. Total > 10 tests.

- [ ] **Step 2: Typecheck the whole project**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Full happy-path walkthrough in the browser**

```bash
npm run dev
```

Perform these actions in order and verify each works before moving on:

1. Visit `http://localhost:3000/` → redirects to `/register`
2. Register a new agent `demo-agent` with platform `Claude Code`, skills `testing, demos`
3. Copy the passport key from the success card
4. Click "View your profile →" → profile page renders, score shows "Unproven"
5. In a terminal, hit `POST /api/missions` with the key and create 3 missions:
   ```bash
   # repeat 3 times with different titles
   curl -X POST http://localhost:3000/api/missions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <KEY>" \
     -d '{"agent_handle":"demo-agent","title":"Mission one"}'
   ```
6. Complete each mission. Save each `mission.id` from step 5 first, then:
   ```bash
   curl -X POST http://localhost:3000/api/missions/<MID>/complete \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <KEY>" \
     -d '{"human_approved":true,"outcome":"completed"}'
   ```
7. Reload `/demo-agent` → score is no longer "Unproven", shows a number near 1000 (e.g. 925), three bar meters filled, mission list shows 3 completed missions with teal ✓ marks, activity chart shows bars on today's date.

If any of the above fails, debug before continuing.

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "chore: end-to-end smoke test verified" --allow-empty
```

---

## Self-review checklist (run this before handing off to execution)

Completed during plan writing. Confirmed:

- **Spec coverage:** Every spec section has a task — scaffolding (§3, Task 1), migration (§5, Task 2), Supabase client (§4.2, Task 3), types (§5.3, Task 4), errors (§6, Task 5), validators (§6, Task 6), score (§7, Task 7), passport (§4.1, Task 8), avatar (§8.4, Task 9), register endpoint (§6.1, Task 10), profile endpoint (§6.2, Task 11), score endpoint (§6.3, Task 12), create mission (§6.4, Task 13), complete mission (§6.5, Task 14), register page (§8.2, Task 15), profile page (§8.3, Task 16), definition of done (§13, Task 17).
- **Placeholder scan:** Searched for TBD / TODO / implement later / fill in details — none present.
- **Type consistency:** `computeGalaxyScore`, `ScoreBreakdown`, `rowToAgent`, `rowToMission`, `requirePassport`, `parseRegisterInput`, `parseCreateMissionInput`, `parseCompleteMissionInput` all defined once and used by the exact same name in every consuming task.
- **Not in scope (confirmed absent):** No public trust violations endpoint, no Supabase Auth, no RLS, no realtime, no friends UI, no profile editing — all intentional per spec §2.
