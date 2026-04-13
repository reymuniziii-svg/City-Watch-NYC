# CLAUDE.md

Guidance for AI coding assistants (Claude Code, Cursor, etc.) working in this repository.

## Project Overview

**City-Watch-NYC** is a civic engagement platform that helps NYC residents track City Council activities, legislation, hearings, campaign finance, and lobbying influence. The frontend is a React 19 + TypeScript SPA that consumes pre-built static JSON generated at build time. Optional Supabase + Clerk + Stripe integration powers Pro-tier features (watchlists, alerts, AI impact analysis, billing).

## Essential Commands

```bash
npm run dev              # Vite dev server (port 5000)
npm run build            # Production build -> dist/
npm run preview          # Preview production build
npm run lint             # TypeScript typecheck ONLY (tsc --noEmit) — there is NO ESLint
npm start                # Production Express server (node server.js)

# Data pipeline (TypeScript scripts run via tsx)
npm run data:sync        # Full pipeline: clone upstream + build all data
npm run data:build       # Rebuild all data JSON without re-cloning upstream
npm run data:districts   # Rebuild district GeoJSON from NYC Open Data
npm run data:bills       # Rebuild bills-index.json
npm run data:members     # Rebuild members-index.json
npm run data:finance     # Rebuild per-member campaign finance profiles
npm run data:hearings    # Rebuild hearings-upcoming.json
npm run data:hearing-enrichment  # Scrape CityMeetings + generate hearing AI summaries
npm run data:lobbying    # Rebuild lobbying data and influence map
npm run data:metrics     # Rebuild member-metrics.json (scorecards)
npm run data:search      # Rebuild search-index.json
npm run check-env        # Validate required env vars
```

**CI gate** = `npm run lint` + `npm run build`. There are no unit tests, no E2E tests, no ESLint, no Prettier, no Husky. Do not add ESLint-style comments or configure linting tools unless explicitly asked.

## Architecture Overview

Two-tier data model:

```
Upstream sources → scripts/*.ts → data/processed/ → public/data/*.json → src/services/nycDataService.ts → React components
```

1. **Build-time data pipeline** (`scripts/`): TypeScript scripts run via `tsx` that fetch from upstream sources (NYC Open Data via Socrata, jehiah/nyc_legislation git repo, NYC Campaign Finance Board CSVs, CityMeetings.nyc). They write intermediate artifacts to `data/processed/` and final static JSON to `public/data/`. AI summaries are generated via Gemini at build time and cached by content hash.

2. **Frontend** (`src/`): React SPA that fetches static JSON from `/data/*.json` at runtime via service-layer functions in `src/services/nycDataService.ts`. Caching is handled by module-level variables — each JSON file is fetched once per session.

3. **Supabase backend** (optional, Pro features only): 18 Deno edge functions + 10 SQL migrations. Handles watchlists, alerts, subscriptions, AI impact analysis, action kits, API keys, and multi-channel notifications.

The production server (`server.js`) is an Express app that serves `dist/`, runs an initial `data:sync` + `build` if no `dist/` exists, and schedules a nightly data refresh at 3:00 AM UTC.

## Directory Map

```
src/
  App.tsx                # Router with 18 routes
  main.tsx               # Entry; conditionally wraps with ClerkProvider
  index.css              # Tailwind v4 + editorial theme variables
  types.ts               # Public types (CouncilMember, Bill, Hearing, CampaignFinance)
  components/            # Flat directory, 40+ files (page + feature components)
  components/shared/     # Reusable UI (IndustryBadge, etc.)
  services/              # nycDataService, supabaseClient, geminiService, actionKitService, etc.
  hooks/                 # useProUser, useFeatureFlags, useMyCM
  lib/
    types.ts             # Detailed internal types matching JSON schemas
    featureFlags.ts      # Tier-based feature gating
    search.ts            # Fuse.js index builder
    exportUtils.ts       # CSV/JSON export helpers
    status-timeline.ts   # Bill status helpers

scripts/
  build-all.ts           # Orchestrates pipeline in dependency order
  sync-upstream.ts       # Shallow-clones jehiah/nyc_legislation
  build-{districts,bills,hearings,finance,lobbying,metrics,members,search-index}.ts
  build-hearing-{enrichment,sentiment,vectors}.ts
  build-influence-map.ts
  generate-summaries.ts  # Gemini bill summaries
  check-env.ts
  post-merge.sh          # Git post-merge hook (runs via Replit)
  lib/                   # Shared: ai.ts, socrata.ts, csv.ts, normalize.ts, hash.ts, fs-utils.ts, constants.ts

supabase/
  migrations/            # 001_initial_schema ... 010_api_keys.sql (profiles, watchlists, subscriptions, platforms, alerts, impact reports, keyword pings, action kits, alert channels, API keys)
  functions/             # 18 Deno edge functions + _shared/auth.ts (Clerk JWKS validation)

public/data/             # Committed static JSON, auto-refreshed daily via GitHub Actions
data/processed/          # Intermediate build artifacts (summary-cache.json, hearing-cache.json)
content/                 # Supplemental data (member-supplemental.json, campaign-finance-overrides.json, transcript-links.json)
.github/workflows/       # ci.yml (typecheck + build) and daily-sync.yml (6 AM ET data refresh)
```

## Code Conventions

- **Components**: Function components with default exports. Flat `src/components/` structure — page-level and feature components coexist. No barrel exports. Example: `export default function BillCard({ bill }: Props) { ... }`.
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin. Theme variables in `src/index.css`:
  - `--color-paper` = `#F9F8F6`
  - `--color-ink` = `#111111`
  - `--color-accent` = `#D92424`
  - Editorial typography: Inter (sans) + Playfair Display (serif)
  - Utility classes: `.font-editorial`, `.border-editorial`, `.border-b-editorial`
- **Class merging**: `cn()` utility (clsx + tailwind-merge) is defined inline in components that need it (e.g., `Layout.tsx`, `MemberDashboard.tsx`). There is no shared `src/lib/utils.ts` — define it locally or reuse from an adjacent component.
- **State**: No Redux/Zustand. Local state via `useState`/`useEffect`. Cross-component persistence via localStorage (e.g., `useMyCM`). Service-layer caches (module-level `let cache = null`) prevent duplicate fetches.
- **Data fetching pattern** (see `src/services/nycDataService.ts`):
  ```ts
  let cache: Bill[] | null = null;
  export async function getBills(): Promise<Bill[]> {
    if (cache) return cache;
    const data = await fetchJson<BillRecord[]>('/data/bills-index.json');
    cache = data.map(mapBillRecord);
    return cache;
  }
  ```
- **Icons**: Lucide React exclusively. Import individual icons: `import { Search, Users } from 'lucide-react'`.
- **Animations**: `motion` package (the new name for Framer Motion). Import from `'motion/react'`, **not** `'framer-motion'`.
- **Imports**: Relative paths in `src/` (`../types`, `../services/nycDataService`). The `@/*` path alias exists but maps to project root (`.`), not `src/` — in practice the frontend uses relative imports everywhere.
- **Commit messages**: Conventional-ish format: `feat: ...`, `fix: ...`, `chore(scope): ...`, `docs: ...`.

## Type System

Two type files with different roles:

- **`src/types.ts`** — Public, component-facing shapes: `CouncilMember`, `Bill`, `Hearing`, `CampaignFinance`, `MemberMetrics`. This is what components import.
- **`src/lib/types.ts`** — Detailed internal shapes matching the raw JSON: `BillRecord`, `MemberProfile`, `MemberSummary`, `HearingRecord`, `HearingSummary`, `MemberLobbyingProfile`, `ConflictAlert`, etc. Used by the data pipeline and internally by `nycDataService.ts`.

`nycDataService.ts` maps between them — it fetches records shaped like `lib/types.ts` and returns the simpler shapes from `src/types.ts`.

## Feature Gating (Pro Tiers)

Three tiers defined in `src/lib/featureFlags.ts`:

- **`free`** — Public content (bills, members, hearings, finance, districts)
- **`advocate`** — Conflict alerts, watchlists, alerts, impact analysis, semantic search, hearing super search, sentiment, lobbying data
- **`enterprise`** — Everything in advocate + data export, action kit creation, API access, SMS/Slack alerts

Usage:
```tsx
const { isPro, isEnterprise, tier } = useProUser();
const flags = useFeatureFlags();
if (flags.canViewConflictAlerts) { ... }

// Or wrap UI with ProGate to blur + show upgrade CTA
<ProGate flag="canUseWatchlists">...</ProGate>
```

## Data Pipeline Details

- **Build order** is defined in `scripts/build-all.ts`. Scripts run sequentially because later steps depend on earlier outputs (e.g., `build-metrics` reads `bills-index.json`, `build-search-index` reads everything).
- **Gemini API** (build-time, `scripts/lib/ai.ts`) uses `gemini-2.5-flash` via the REST API directly, with retry logic and structured JSON output. Responses are cached in `data/processed/summary-cache.json` keyed by bill ID + status + title hash. Unchanged bills are not re-summarized.
- **Gemini API** (client-side, `src/services/geminiService.ts`) uses `gemini-3-flash-preview` via the `@google/genai` SDK. The key is injected at build time by `vite.config.ts` as `process.env.GEMINI_API_KEY`.
- **GEMINI_API_KEY is optional.** Without it, the pipeline skips AI summaries and uses fallback content; the client-side AI features degrade gracefully.
- **Session year range** is configured via `SESSION_START_YEAR` / `SESSION_END_YEAR` env vars.
- **Upstream legislative data** is shallow-cloned by `sync-upstream.ts` from `https://github.com/jehiah/nyc_legislation` into `data/raw/nyc_legislation/`.
- **NYC Open Data** access uses `NYC_OPENDATA_APP_TOKEN` (optional, avoids Socrata rate limits). The client is in `scripts/lib/socrata.ts` and handles pagination + retries.

## Supabase Edge Functions

All 18 functions are **Deno-based** (not Node):

- ESM imports from `https://deno.land/std` and `https://esm.sh/` — no npm, no `node_modules`
- Auth validation via `supabase/functions/_shared/auth.ts` (Clerk JWKS)
- Service role Supabase client (`createAdminClient()`) bypasses RLS where needed
- Consistent pattern: CORS headers → OPTIONS handler → JWT validation → route by HTTP method
- Functions: `watchlist`, `get-user-profile`, `analyze-impact`, `generate-impact-pdf`, `send-digest`, `send-slack`, `send-sms`, `create-checkout-session`, `stripe-webhook`, `alert-preferences`, `api-keys`, `api-v1`, `action-kits`, `action-kit-submit`, `action-kit-analytics`, `upload-platform`, `keyword-ping`

Required Supabase secrets: `CLERK_JWKS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus feature-specific ones (`GEMINI_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).

All SQL tables use Row-Level Security (RLS); authenticated users can only read/write their own rows.

## Environment Variables

**Build-time (data pipeline):**
- `GEMINI_API_KEY` — AI summaries (optional; fallback used without)
- `NYC_OPENDATA_APP_TOKEN` — Socrata API (optional; avoids throttling)
- `SESSION_START_YEAR` / `SESSION_END_YEAR` — Legislative session range

**Frontend (Vite, prefixed with `VITE_`):**
- `VITE_SUPABASE_URL` — Supabase project URL (Pro features)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (Pro features)
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth (optional; app works without auth)
- `GEMINI_API_KEY` — Injected via `vite.config.ts` as `process.env.GEMINI_API_KEY` for client-side AI

**Server-side Supabase secrets (edge functions):**
- `CLERK_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ADVOCATE_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`, `RESEND_API_KEY`

**Production server:**
- `PORT` — Server port (default 5000)
- `APP_URL` — Self-referential URL for OAuth callbacks

## Gotchas

1. **`npm run lint` is ONLY `tsc --noEmit`.** No ESLint config exists. Do not add ESLint directives, comments, or configs.
2. **`motion/react`, not `framer-motion`.** The package is named `motion` and imports come from `'motion/react'`.
3. **Path alias `@/*` maps to project root (`.`)**, not `src/`. Frontend code uses relative imports anyway.
4. **Supabase and Clerk are optional.** `main.tsx` conditionally wraps with `ClerkProvider`; `supabaseClient.ts` exports `null` if not configured; `useProUser()` returns a free-tier state immediately if no Clerk key. Always code for the case where these services are absent.
5. **`public/data/*.json` is committed to the repo** and auto-refreshed by the daily GitHub Action. Do not gitignore it.
6. **No tests exist.** CI validation is typecheck + build only. Do not claim a feature "passes tests" — there are no tests to pass.
7. **Two Gemini models:** `gemini-2.5-flash` (build-time, via REST) and `gemini-3-flash-preview` (client-side, via `@google/genai` SDK). Don't conflate them.
8. **Production `server.js` runs its own nightly refresh at 3 AM UTC.** GitHub Actions runs a separate 6 AM ET refresh. Both commit JSON to the repo.
9. **The `cn()` utility is not in a shared file.** It's defined inline where used. Either inline it again or reuse the existing definition — don't invent a new `src/lib/utils.ts` without a reason.
10. **Vite file watcher ignores `data/**`, `.local/**`, `node_modules/**`, `.git/**`.** Rebuilding data files won't trigger HMR reloads.
11. **The Gemini API key is exposed to the client.** `vite.config.ts` injects `process.env.GEMINI_API_KEY` into the bundle. Any key committed here is effectively public — use a restricted key.
12. **The data pipeline is order-sensitive.** Running scripts out of order (e.g., `build-metrics` before `build-bills`) will produce incomplete or stale output. When in doubt, run `npm run data:build` to rebuild everything.

## Routes

Defined in `src/App.tsx`:

- `/` — Address search (find your council member)
- `/members` — All members list
- `/members/:id` and `/members/district/:district` — Member dashboard
- `/districts` — District explorer map (Leaflet)
- `/bills` — Bill tracker
- `/hearings` — Upcoming hearings
- `/money` — Campaign finance explorer
- `/influence` — Lobbying influence mapper
- `/watchlist` — Saved items (Pro)
- `/impact` — AI impact analysis (Pro)
- `/action-kits` and `/action-kits/:id/edit` — Civic action campaigns
- `/embed/:kitId` — Embeddable action kit widget
- `/api-docs` — Public REST API docs
- `/pricing` — Subscription plans
- `/support` — Help
- `*` — 404

## Development Branch

Work happens on feature branches named `claude/<feature>-<suffix>` branched from `main`. The current branch is tracked in the task description. Push to that branch; do not push to `main` without explicit permission.
