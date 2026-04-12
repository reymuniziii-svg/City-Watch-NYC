# City Watch NYC

## Project Overview

A full-stack civic intelligence platform for tracking NYC City Council activities. Residents can explore districts, monitor council members, track legislation, follow campaign finance money, investigate donor-to-legislator influence networks, and engage with their representatives. The app combines a static data pipeline (build-time TypeScript scripts) with a React frontend and a Supabase backend for Pro features. AI-powered features use Google's Gemini API for bill summaries, hearing enrichment, chat assistance, and policy impact analysis.

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite 6, Tailwind CSS v4, React Router v7
- **Mapping:** Leaflet / React-Leaflet (GeoJSON district overlays)
- **Charts:** Recharts (pie, bar charts for campaign finance)
- **Search:** Fuse.js (client-side fuzzy search)
- **Animations:** Motion (Framer Motion)
- **AI:** Google Generative AI (@google/genai) -- Gemini (build-time + client-side + server-side)
- **Authentication:** Clerk (@clerk/clerk-react) -- graceful degradation when key absent
- **Database:** Supabase (PostgreSQL + Edge Functions + Storage)
- **Payments:** Stripe (subscription billing with webhooks)
- **Email:** Resend (transactional digest emails)
- **Data Scripts:** tsx (TypeScript runner for build-time data pipeline)
- **Production Server:** Express (static file serving + nightly data refresh)
- **Package Manager:** npm

## Project Structure

- `src/` -- React application source
  - `components/` -- 29 UI components (pages, cards, modals, layout)
  - `services/` -- Data fetching (nycDataService), AI (geminiService), Supabase client, watchlist/alert/platform services
  - `hooks/` -- useMyCM (council member lookup by address)
  - `lib/` -- Shared types, feature flags, search index
  - `data/` -- Donation config
- `scripts/` -- Data ingestion/processing TypeScript scripts (12 scripts + lib/)
- `content/` -- Supplemental member profile data and campaign finance overrides
- `public/data/` -- Generated processed JSON files consumed by the frontend
- `supabase/` -- Backend infrastructure
  - `functions/` -- 9 Deno edge functions + `_shared/auth.ts`
  - `migrations/` -- 6 PostgreSQL migrations
- `server.js` -- Express production server with nightly data refresh
- `.github/workflows/` -- CI (typecheck + build) and daily data sync

## Features by Tier

### Free
- Address lookup with instant animated district preview
- All 51 council member profiles (activity, bills, finance, hearings tabs)
- Bill tracker with AI plain-English explainers and status timelines
- Civic Action Center (contact CM, support/oppose, email template, social sharing)
- Campaign finance profiles (donations, expenditures, grassroots grade, industry breakdown)
- Hearing calendar (upcoming + past 90 days with real transcript quotes)
- Interactive district map (Leaflet + GeoJSON)
- Global fuzzy search (sidebar + mobile drawer)
- AI chat assistant (floating widget)
- AI source citations on all generated content
- Donation / support page (Stripe Payment Links)

### Pro (Advocate $9/mo or $89/yr, Enterprise $29/mo or $279/yr)
- Influence Mapper (donor-to-sponsor-to-bill network, sortable/filterable)
- Conflict Alerts (donation timing vs bill introduction detection)
- Personal Watchlist (bills, members, keywords)
- Email digest alerts (daily/weekly via Resend)
- Policy platform upload (PDF/TXT to Supabase Storage)
- AI impact analysis (classify bills against policy platform via Gemini)
- Impact analysis PDF reports (pdf-lib generated, stored in Supabase Storage)

## Backend Services

### Authentication -- Clerk
- `VITE_CLERK_PUBLISHABLE_KEY` -- Clerk publishable key (frontend)
- App wraps with `<ClerkProvider>` only when key is present (graceful degradation)
- Clerk user ID is the primary user identifier throughout
- Edge functions validate Clerk JWTs via JWKS endpoint

### Database -- Supabase
- `VITE_SUPABASE_URL` -- Supabase project URL
- `VITE_SUPABASE_ANON_KEY` -- Supabase anon/public key (frontend)
- `SUPABASE_PROJECT_REF` -- Project reference ID (for CLI operations)
- 6 migrations: profiles, watchlist_items, subscriptions, policy_platforms, alert_preferences, impact_reports
- RLS is enabled; all authenticated data access goes through edge functions

### Supabase Edge Functions (9 deployed)
- `watchlist` -- GET/POST/DELETE watchlist items
- `get-user-profile` -- Fetch profile + subscription; auto-upserts on first sign-in
- `alert-preferences` -- GET/POST alert preferences (frequency: daily/weekly)
- `analyze-impact` -- AI policy impact analysis (Pro-gated, uses Gemini)
- `generate-impact-pdf` -- Generate PDF impact report (pdf-lib, stored in Storage)
- `upload-platform` -- GET/POST/DELETE policy platform files
- `create-checkout-session` -- Stripe checkout with monthly/yearly billing support
- `stripe-webhook` -- Handle checkout.session.completed, customer.subscription.*, invoice.payment_succeeded
- `send-digest` -- Email digest via Resend (deployed with --no-verify-jwt for cron)

All edge functions use `_shared/auth.ts` for Clerk JWT validation (strict issuer enforcement via JWKS) and Supabase service-role admin client (bypasses RLS).

**Supabase secrets required:** `CLERK_JWKS_URL`, `GEMINI_API_KEY`, `APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ADVOCATE_PRICE_ID`, `STRIPE_ADVOCATE_YEARLY_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`, `STRIPE_ENTERPRISE_YEARLY_PRICE_ID`

### Storage
- Bucket: `policy-platforms` (private, 10MB limit, pdf/txt only)
- Used for uploaded policy files and generated PDF impact reports

## Data Pipeline

Build-time TypeScript scripts (`scripts/`) process raw data into static JSON:

| Script | Input | Output |
|--------|-------|--------|
| `sync-upstream.ts` | GitHub repo | `data/raw/nyc_legislation/` |
| `build-bills.ts` | Raw legislation | `public/data/bills-index.json` |
| `build-districts.ts` | NYC Open Data | `public/data/districts-index.json`, `district-map.geojson` |
| `build-members.ts` | Supplemental data | `public/data/members-index.json`, `members/*.json` |
| `build-hearings.ts` | Raw events | `public/data/hearings-upcoming.json`, `hearings-past.json` |
| `build-hearing-enrichment.ts` | CityMeetings.nyc | `public/data/hearing-enrichment.json` |
| `generate-summaries.ts` | Bills + cache | Response cache (AI bill explainers) |
| `build-finance.ts` | NYC CFB CSVs | `public/data/finance/*.json` |
| `build-influence-map.ts` | Finance + bills | `public/data/influence-map.json`, `conflict-alerts.json` |
| `build-metrics.ts` | Bill records | `public/data/member-metrics.json` |
| `build-search-index.ts` | All data | `public/data/search-index.json` |
| `check-env.ts` | -- | Validates environment variables |

## Environment Variables

- `GEMINI_API_KEY` -- Required for AI features (build-time summaries, client chat, impact analysis)
- `APP_URL` -- The URL where the app is hosted (used in emails and links)
- `VITE_SUPABASE_URL` -- Supabase project URL (optional; Pro features only)
- `VITE_SUPABASE_ANON_KEY` -- Supabase anonymous key (optional; Pro features only)
- `VITE_CLERK_PUBLISHABLE_KEY` -- Clerk publishable key (optional; auth disabled when absent)
- `SUPABASE_PROJECT_REF` -- Supabase project reference (for CLI)

## Development

- Dev server runs on port 5000 at 0.0.0.0
- `npm run dev` -- Start development server
- `npm run build` -- Production build via Vite
- `npm run start` -- Production Express server (`node server.js`)
- `npm run lint` -- TypeScript type checking (`tsc --noEmit`)
- `npm run check-env` -- Validate environment variables
- `npm run data:sync` -- Full data pipeline (sync upstream + build all)
- `npm run data:build` -- Rebuild all data without re-cloning upstream
- Individual data scripts: `data:bills`, `data:members`, `data:finance`, `data:hearings`, `data:hearing-enrichment`, `data:metrics`, `data:search`, `data:districts`

## Production Server (`server.js`)

A small Express server handles production deployment:
- Serves built static files from `dist/`
- On startup, automatically runs `data:sync` + `build` if no `dist/` exists
- Schedules a **nightly refresh at 3:00 AM UTC**: re-runs `data:sync` then `npm run build` in the background while continuing to serve the current build
- Run command: `node server.js`

## Deployment

- **Vercel**: Static deployment (`.vercel/` config present)
- **Self-hosted**: `node server.js` -- handles all data sync and builds automatically
- **GitHub Actions CI**: Runs typecheck + build on every push to `main` and PRs
- **Daily Data Sync**: GitHub Action at 6:00 AM ET clones upstream, runs full pipeline, auto-commits

## Routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | AddressSearch | No |
| `/members` | MemberList | No |
| `/members/:id` | MemberDashboard | No |
| `/members/district/:district` | MemberDashboard | No |
| `/districts` | DistrictsPage | No |
| `/bills` | BillList | No |
| `/hearings` | HearingList | No |
| `/money` | MoneyPage | No |
| `/influence` | InfluenceMapperPage | No (Pro-gated sections) |
| `/watchlist` | WatchlistPage | Yes (Clerk) |
| `/pricing` | PricingPage | No |
| `/support` | SupportPage | No |

## Mobile Optimization

- All major cards (BillCard, HearingCard, PricingPage TierCard) use responsive padding: `p-4 md:p-8`
- BillCard action buttons use flex-wrap to avoid overflow on narrow screens
- MemberDashboard tab bar uses `sticky top-[57px] md:top-0` to avoid colliding with the mobile header
- MemberDashboard profile photo is `w-32 h-32 md:w-48 md:h-48`
- MoneyPage has a mobile card-list view (`sm:hidden`) alongside the desktop table (`hidden sm:block`)
- MoneyPage summary strip shows 3 stats (Real Estate Flagged stat removed)
- Mobile header includes a search icon that opens a slide-down search drawer
- ChatAssistant uses `inset-x-3 bottom-3` on mobile, `bottom-8 right-8` on desktop, z-50
- ScrollToTop button uses `bottom-16 right-3` on mobile, `bottom-8 right-20` on desktop, z-40 (below chat)

## Known Issues / Notes

- Vite file watcher is configured to ignore `.local/**`, `data/**`, and `node_modules/**` to prevent reload loops from Replit's internal log files and the large raw data directory
- Tailwind CSS v4 content scanner is configured via `@source "!..."` in `src/index.css` to exclude `.local/`, `data/`, and `node_modules/`
- `GEMINI_API_KEY` is optional; fallback summaries are used when absent
- Clerk auth is optional; `AuthButton` returns null when key is absent, watchlist/pricing degrade gracefully
- Supabase is optional; `WatchButton` returns null, `WatchlistPage` shows "configure Supabase" message when keys are absent
- Stripe is in test mode; product and price IDs are configured via environment variables
