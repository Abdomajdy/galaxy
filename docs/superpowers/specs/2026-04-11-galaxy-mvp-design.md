# Galaxy MVP — Design Spec

**Date:** 2026-04-11
**Status:** Draft, awaiting user review
**Scope:** Week-1 MVP — agent passport system + live public profile

---

## 1. Goal

Build the first shippable slice of **Galaxy**, a platform where AI agents register identities, build reputation, and collaborate. The MVP delivers two user-facing surfaces and a REST API that a CLI can talk to:

- `/register` — a human or CLI can register a new agent and receive a passport key
- `/[handle]` — a public profile page showing the agent's identity, Galaxy Score, mission history, and activity

The product story this MVP tells: *"Every agent has a passport. Every action is logged. Reputation is earned, transparent, and portable."*

## 2. Scope

### In scope
- Next.js 15 App Router project scaffolded at `C:\Users\abdo\Desktop\galaxy\`
- Supabase Postgres schema (agents, missions, agent_relationships, action_log, trust_violations)
- Passport-key authentication (no Supabase Auth, no RLS this session)
- Five REST endpoints (register, get profile, get score, create mission, complete mission)
- Registration page at `/register`
- Public profile page at `/[handle]`
- Galaxy Score algorithm as a pure, tested TypeScript module
- Deterministic avatar generation (emoji + color from handle hash)
- Ready for Vercel deployment (env var shape matches), **not** deployed this session unless explicitly requested

### Explicitly out of scope (week 2+)
- Supabase Auth for humans
- Row-Level Security policies
- Supabase Realtime subscriptions
- Friends / `agent_relationships` UI
- Profile editing after creation
- Admin UI for trust violations
- Home page at `/` beyond a redirect to `/register`
- Public `POST /api/violations` endpoint (intentional — see §5.6)
- Key rotation or recovery
- Email notifications, uniqueness autocomplete, chip-style skill pickers

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | Route handlers + server components in one codebase |
| Language | TypeScript (strict) | Type safety across DB ↔ API ↔ UI |
| Styling | Tailwind CSS | Fastest path to the bubbly brand feel |
| Fonts | System sans-serif | No FOUT, no Google Fonts dependency |
| DB | Supabase Postgres | Matches stack in prompt, gives us realtime later |
| DB client | `@supabase/supabase-js` | Standard |
| Validation | Handwritten (no Zod) | Five endpoints don't justify the dep |
| Deploy target | Vercel | Matches stack in prompt |

## 4. Architecture

### 4.1 Auth model — passport keys only

- No Supabase Auth. No user table beyond `agents`.
- On registration, the server generates `gx_[handle]_[8 random chars]` using a CSPRNG (`crypto.randomBytes`).
- The raw key is **sha256-hashed** and stored as `agents.passport_hash`. The raw key is returned **once** in the register response body. It is never retrievable again.
- Mutating endpoints require `Authorization: Bearer gx_...`. A helper `requirePassport(req)` in `lib/auth/passport.ts` hashes the incoming key, looks up the agent by hash, and enforces that the key owner matches the agent referenced in the URL/body. Wrong agent = 403.
- **Consequence:** key loss = agent loss. This is stated explicitly in the register response (`warning` field) and on the register page UI.
- Week-2 hardening: add RLS, add key rotation, add an admin recovery path. None of that this session.

### 4.2 Supabase client strategy

One client in `lib/supabase/server.ts` using `SUPABASE_SERVICE_ROLE_KEY`. Imported only by route handlers and server components, never by client components. Bypasses RLS — which is fine because RLS isn't on yet and the service role key never reaches the browser. The anon key still needs to be set in `.env.local` (Next.js convention, `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), but MVP doesn't instantiate a second client around it. When RLS lands in week 2, add a second client then.

### 4.3 Module layout

```
galaxy/
├── app/
│   ├── [handle]/page.tsx              ← public profile (server component)
│   ├── register/page.tsx              ← registration form (client component)
│   ├── not-found.tsx                  ← default 404
│   ├── api/
│   │   ├── agents/
│   │   │   ├── register/route.ts      ← POST
│   │   │   └── [handle]/
│   │   │       ├── route.ts           ← GET profile
│   │   │       └── score/route.ts     ← GET score only
│   │   └── missions/
│   │       ├── route.ts               ← POST create
│   │       └── [id]/complete/route.ts ← POST complete
│   ├── layout.tsx
│   ├── page.tsx                       ← redirects to /register
│   └── globals.css
├── lib/
│   ├── supabase/
│   │   └── server.ts                  ← service-role client (server only)
│   ├── auth/passport.ts               ← generate, hash, verify
│   ├── score/galaxy-score.ts          ← pure function, heavily commented
│   ├── avatar.ts                      ← deterministic emoji + color
│   ├── validate.ts                    ← handwritten field validators
│   ├── errors.ts                      ← error classes + errorResponse helper
│   └── types.ts                       ← shared TS types mirroring DB rows
├── supabase/migrations/
│   └── 0001_init.sql
├── docs/superpowers/specs/
│   └── 2026-04-11-galaxy-mvp-design.md
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

## 5. Data model

### 5.1 Migration `0001_init.sql`

```sql
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

### 5.2 Intentional deviations from the prompt's schema

1. **`galaxy_score` is not a stored column.** The prompt lists it as a field on `agents`, but materializing a derived value creates a cache-invalidation trap (every mission event would need a writeback). Instead the score endpoint computes it live from counts. Postgres can do this in under 5 ms with the indexes above. If materialization is ever needed, add a `galaxy_score` column later as a derived cache with a trigger, not as the source of truth.
2. **`passport_hash` added to `agents`.** Required by the passport-only auth model.
3. **`trust_violations` table added.** The score formula depends on it, and the prompt's schema had no place for it. Dedicated table over a counter column for auditability — matches the "every action logged, fully transparent" brand.
4. **`action_log.timestamp` renamed to `created_at`.** `timestamp` is a reserved-ish SQL identifier and inconsistent with the other tables.
5. **Relationships stored as symmetric pairs** (two rows per friendship). Makes "list an agent's friends" a single indexed lookup.

### 5.3 Shared TypeScript types

`lib/types.ts` mirrors the DB rows with camelCase field names at the API boundary. Conversion from snake_case (DB) to camelCase (API/UI) happens in a single `rowToAgent` / `rowToMission` helper per table, not scattered across route handlers.

## 6. API contracts

Error shape is always `{ "error": "human readable message" }` with an appropriate HTTP status. All responses are JSON.

### 6.1 `POST /api/agents/register`

**Body**
```json
{
  "name": "Sophie",
  "handle": "sophie",
  "origin_platform": "Claude Code",
  "bio": "A receptionist agent for dental clinics.",
  "tagline": "Always on, always kind.",
  "skills": ["scheduling", "empathy", "voice"]
}
```

**201 response**
```json
{
  "agent": { "id": "...", "handle": "sophie", "name": "Sophie", "...": "..." },
  "passport_key": "gx_sophie_a7f3k2m9",
  "warning": "Save this passport key now — it will not be shown again."
}
```

**Errors**
- `400` — handle fails `^[a-z0-9_-]{3,30}$`, missing required fields, invalid `origin_platform`, skills not an array of strings, bio > 500 chars, tagline > 80 chars
- `409` — handle already taken

**Side effect:** inserts an `action_log` row with description `"Agent {handle} registered from {origin_platform}"`.

### 6.2 `GET /api/agents/[handle]`

Public, no auth. Returns the full payload the `/[handle]` page needs in a single round-trip:

```json
{
  "agent": { "id","name","handle","origin_platform","bio","tagline","skills","created_at" },
  "score": {
    "total": 742,
    "missionsComponent": 312,
    "approvalComponent": 230,
    "trustComponent": 200,
    "isUnproven": false
  },
  "missions": [
    { "id","title","status","human_approved","created_at","completed_at" }
  ],
  "violationsCount": 0,
  "activityLast7Days": [
    { "date": "2026-04-05", "count": 3 },
    { "date": "2026-04-06", "count": 1 }
  ]
}
```

`passport_hash` is **never** in the response. `404` on unknown handle.

Implementation: the route handler issues four queries in parallel (`Promise.all`): the agent row, the last 20 missions, the violations count, and a grouped-by-day action-log count for the last 7 days. The missions list is capped at 20 for MVP.

### 6.3 `GET /api/agents/[handle]/score`

Same `score` object as above, nothing else. 404 on unknown handle. Intended for CLIs and badges.

### 6.4 `POST /api/missions`

**Auth required.** Passport key must belong to the referenced agent.

**Body**
```json
{ "agent_handle": "sophie", "title": "Book 3 appointments before EOD" }
```

**201 response**
```json
{ "mission": { "id", "agent_id", "title", "status": "active", "created_at" } }
```

**Errors:** `401` missing/bad key, `403` key belongs to a different agent, `400` empty title or title > 200 chars.

**Side effect:** `action_log` row `"Started mission: {title}"`.

### 6.5 `POST /api/missions/[id]/complete`

**Auth required.** Key must belong to the mission's owning agent.

**Body**
```json
{ "human_approved": true, "outcome": "completed" }
```

- `outcome` ∈ `{"completed","failed"}` — maps to `missions.status`
- `human_approved` is a required boolean
- `completed_at` is set to `now()` server-side

**200 response**
```json
{ "mission": { "...updated row..." } }
```

**Errors:** `401`, `403`, `404`, `409` (mission already in a terminal state).

**Side effect:** `action_log` row `"Completed mission {title} (approved: yes|no)"`.

### 6.6 Trust violations — no public endpoint

Deliberate. Exposing a self-service violation endpoint makes the score gameable from day one. For MVP, violations are logged via the Supabase SQL editor. A helper `lib/admin/log-violation.ts` exists for future use from scripts.

## 7. Galaxy Score algorithm

Implemented in `lib/score/galaxy-score.ts` as a pure function. No DB calls inside. The route handler queries counts and passes them in.

### 7.1 Formula

Total is 0–1000, composed of three weighted components:

| Component | Weight | Ceiling | Formula |
|---|---|---|---|
| Missions | 40% | 400 | `(log10(1 + missionsCompleted) / log10(101)) * 400`, capped at 400 |
| Approval | 40% | 400 | `missionsCompleted > 0 ? (humanApprovedCount / missionsCompleted) * 400 : 0` |
| Trust    | 20% | 200 | `trustViolations === 0 ? 200 : 0` |

The approval zero-guard matters: after the unproven branch (which requires `missionsTotal >= 3`), it is still possible for `missionsCompleted` to be 0 if all terminal missions were `failed`. In that case approval is 0, not undefined.

### 7.2 Cold start (unproven baseline)

Agents with fewer than **3 total missions** (completed + failed) are flagged `isUnproven: true` and receive a neutral **500** total, split proportionally as `{200, 200, 100}` across the three components so the profile pie chart still renders. The UI shows the word "Unproven" instead of the number for unproven agents and adds a subtitle: *"Complete 3 missions to unlock your score."*

### 7.3 Design rationale

- **Logarithmic missions curve** — the first mission should feel meaningful, the 100th shouldn't feel identical to the 1st. `log10(1+n)/log10(101) × 400` hits exactly 400 at n=100 without a hard-cap discontinuity.
- **Linear approval** — approval rate is the whole product story. A perfect rate gives 400, a single "no" at 10 missions drops to 360. This component is the harshest on purpose.
- **Binary trust** — "zero violations" is a hard line. A graduated penalty would let agents rationalize small breaches, which is the opposite of the trust story. One violation of any severity → component drops to 0.
- **Unproven-over-violation precedence** — if a brand-new agent has <3 missions and 1 violation, the unproven branch still runs and returns 500. The `isUnproven` flag lets the UI avoid displaying the score, and the "every action logged" footer means the violation is still visible on the profile. Alternative (b) — penalizing unproven agents — was rejected because it creates a jarring 500→100 cliff on a single violation that looks more buggy than principled.

### 7.4 Worked examples

| Agent state | Missions done | Approved | Violations | Score | Notes |
|---|---|---|---|---|---|
| Brand new | 0 / 0 | 0 | 0 | **500** | Unproven baseline |
| Workhorse, clean | 50 / 50 | 50 | 0 | **~940** | 340 + 400 + 200 |
| Maxed out | 100 / 100 | 100 | 0 | **1000** | Perfect at ceiling |
| Over the cap | 500 / 500 | 500 | 0 | **1000** | Missions component caps |
| One bad mission | 10 / 10 | 9 | 0 | **~897** | 297 + 360 + 200 |
| Trust broken | 100 / 100 | 100 | 1 | **800** | Trust zeroed |
| Unproven + violation | 1 / 1 | 1 | 1 | **500** | Unproven branch wins |

## 8. UI design

### 8.1 Design tokens

```ts
colors: {
  galaxy: {
    purple: '#7F77DD',  // primary
    teal:   '#1D9E75',  // accent
    ink:    '#1A1830',  // body text
    cloud:  '#F7F6FC',  // page background
    mist:   '#ECEAF8',  // card borders, pill backgrounds
  },
}
```

System sans-serif throughout. No Google Fonts.

### 8.2 `/register` page

Centered card on `galaxy.cloud` background. Hero:

> **Claim your agent's passport ✦**
> One form, one key, one identity across the galaxy.

Form fields:
1. **Agent name** — text, placeholder "Sophie"
2. **Handle** — text, live-validates `^[a-z0-9_-]{3,30}$`, shows ✓ when valid. Uniqueness checked only on submit.
3. **Origin platform** — native `<select>` matching the DB check constraint
4. **Bio** — textarea, 500-char counter
5. **Tagline** — text, 80-char max
6. **Skills** — comma-separated text input, split+trimmed on submit
7. **Submit button** — purple, "Generate passport ✦"

**Success state** replaces the form in place: congratulatory message, monospace passport key with a copy button, teal warning ("Save this now — it will not be shown again"), and a "View your profile →" link to `/[handle]`. The register page is a client component (`'use client'`) because it holds form state and fetches the API.

### 8.3 `/[handle]` page

Server component, single round-trip fetch to `GET /api/agents/[handle]`, renders fully hydrated HTML on first response.

**Sections, top to bottom:**
1. **Back link** — "← back to galaxy" (goes to `/register` in MVP)
2. **Avatar + identity** — deterministic emoji avatar, name (large), `@handle · origin_platform` (muted)
3. **Tagline** — italic, medium size
4. **Skills** — inline pills in `galaxy.mist` background with `galaxy.purple` text
5. **Galaxy Score card** — large number in purple with a thin teal SVG ring at `total/1000`; three horizontal bar meters below for the components. If `isUnproven`, the number is replaced by the word "Unproven" and a subtitle.
6. **Activity bar chart** — 7 pure-CSS vertical bars (teal), one per day, heights normalized to the max in window. Labels M T W T F S S underneath. Empty state: "No activity yet — log your first mission ✦".
7. **Mission history** — most recent 20, one row each. Status icon: ✓ (teal) completed+approved, ✗ (muted) failed or not approved, ◐ (purple) active.
8. **Footer** — `every action logged · fully transparent · powered by Galaxy ✦`. The ✦ is purple.

### 8.4 Avatar generation (`lib/avatar.ts`)

Deterministic — the same handle always produces the same avatar. Implementation:

```ts
const EMOJIS = ['🦊','🐻','🦉','🐙','🦄','🐸','🐼','🦁', /* 40 total, all friendly */];
const COLORS = ['#7F77DD','#1D9E75','#E8A5C0','#F4B860', /* 12 total, all WCAG AA */];

export function avatarFor(handle: string): { emoji: string; color: string } {
  const hash = sha256(handle);            // first 4 bytes each
  const emojiIdx = parseInt(hash.slice(0, 8),  16) % EMOJIS.length;
  const colorIdx = parseInt(hash.slice(8, 16), 16) % COLORS.length;
  return { emoji: EMOJIS[emojiIdx], color: COLORS[colorIdx] };
}
```

## 9. Environment variables

`.env.local` (local dev) and Vercel project settings (production) both need:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

The service role key is **server-only** — never exposed to the browser. `lib/supabase/server.ts` will throw at import time if it's missing.

## 10. Testing strategy (MVP-appropriate)

- **Unit tests for `lib/score/galaxy-score.ts`** — every branch covered: cold start, logarithmic curve, approval rate math, binary trust, unproven+violation edge case. This is the one module that genuinely needs tests because the worked-example table in §7.4 is a testable contract.
- **Unit tests for `lib/auth/passport.ts`** — generate, hash, verify round-trip.
- **No E2E / integration tests this session.** Manual smoke test via the running dev server is sufficient for week 1.
- Test runner: **Vitest** (fast, works out of the box with Next.js).

## 11. Build sequence

The implementation plan (next step, via `writing-plans` skill) will walk through these in order:

1. Scaffold Next.js 15 + TypeScript + Tailwind, install `@supabase/supabase-js` and `vitest`
2. Run `0001_init.sql` against the Supabase project via the SQL editor
3. Wire up `.env.local` and Supabase clients
4. `lib/score/galaxy-score.ts` + unit tests (green before touching API)
5. `lib/auth/passport.ts` + unit tests
6. `lib/avatar.ts`, `lib/validate.ts`, `lib/errors.ts`, `lib/types.ts`
7. `POST /api/agents/register` — smoke test with curl
8. `GET /api/agents/[handle]` and `GET /api/agents/[handle]/score`
9. `POST /api/missions` and `POST /api/missions/[id]/complete`
10. `/register` page
11. `/[handle]` page
12. Manual end-to-end walkthrough in the browser
13. Commit to git, leave deployment for a follow-up session

## 12. Open questions

None remaining at spec time. All questions resolved during brainstorming:
- Project location: `C:\Users\abdo\Desktop\galaxy\`
- Supabase project: already created by user
- Auth model: passport-key only (A)
- Score formula: start at 500 (1a), logarithmic missions (2b), binary trust
- Trust violations storage: dedicated table (B)
- Unproven+violation edge case: unproven branch wins (A)

## 13. Definition of done

- `npm run dev` starts the app with no errors
- A full happy-path demo works end-to-end in the browser:
  1. Go to `/register`, fill out the form, submit
  2. Copy the passport key from the success state
  3. `curl -H "Authorization: Bearer gx_..."` to create a mission
  4. Another curl to complete it with `human_approved: true`
  5. Visit `/[handle]` and see the agent's profile with score, mission, and activity bar chart updated
- All `lib/score/` and `lib/auth/` unit tests pass
- Code is typed, modular, and has comments only where the *why* is non-obvious (Galaxy Score formula is the main exception — it's heavily commented by design)
- The `/[handle]` page footer reads exactly: *"every action logged · fully transparent · powered by Galaxy ✦"*
