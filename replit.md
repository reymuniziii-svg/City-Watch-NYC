# City Watch NYC

## Project Overview
A React web application for tracking NYC City Council activities. Allows residents to explore districts, monitor council members, track legislation (bills), and view upcoming hearings. Includes AI-powered features via Google's Gemini API.

## Tech Stack
- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Mapping:** Leaflet / React Leaflet
- **Charts:** Recharts
- **Search:** Fuse.js (client-side fuzzy search)
- **AI:** Google Generative AI (@google/genai) - Gemini
- **Data Scripts:** tsx (TypeScript runner for build scripts)
- **Package Manager:** npm

## Project Structure
- `src/` - React application source
  - `components/` - UI components
  - `services/` - API and data services (geminiService, nycDataService)
  - `lib/` - Shared utilities and types
  - `data/` - Static JSON data
- `scripts/` - Data ingestion/processing TypeScript scripts
- `content/` - Supplemental member profile data and campaign finance overrides
- `public/data/` - Generated processed JSON files consumed by the frontend

## Backend Services

### Authentication — Clerk
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (frontend)
- App wraps with `<ClerkProvider>` only when key is present (graceful degradation)
- Clerk user ID is used as the primary user identifier throughout

### Database — Supabase
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (frontend)
- `SUPABASE_PROJECT_REF` — Project reference ID (for CLI operations)
- 6 migrations applied: profiles, watchlist_items, subscriptions, policy_platforms, alert_preferences, impact_reports
- RLS is enabled; all data access for authenticated operations goes through edge functions

### Supabase Edge Functions (8 deployed)
- `watchlist` — GET/POST/DELETE watchlist items
- `get-user-profile` — Fetch profile + subscription for authenticated user
- `send-digest` — Email digest (requires RESEND_API_KEY in Supabase secrets)
- `analyze-impact` — AI policy impact analysis (requires Pro subscription)
- `generate-impact-pdf` — Generate PDF impact report
- `upload-platform` — Upload policy platform file to Storage
- `create-checkout-session` — Stripe checkout (requires Stripe secrets)
- `stripe-webhook` — Handle Stripe subscription events

All edge functions validate Clerk JWTs via Clerk's JWKS endpoint (`_shared/auth.ts`) and use the Supabase service role client (bypasses RLS). Supabase secrets needed: `CLERK_JWKS_URL`, `GEMINI_API_KEY`, `APP_URL`, `RESEND_API_KEY` (for email), `STRIPE_SECRET_KEY` / `STRIPE_ADVOCATE_PRICE_ID` / `STRIPE_ENTERPRISE_PRICE_ID` (for payments).

### Storage
- Bucket: `policy-platforms` (private, 10MB limit, pdf/txt only)
- Used for uploaded policy files and generated PDF impact reports

## Environment Variables
- `GEMINI_API_KEY` - Required for AI features (bill summaries, chat assistant)
- `APP_URL` - The URL where the app is hosted
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `SUPABASE_PROJECT_REF` - Supabase project reference (for CLI)

## Development
- Dev server runs on port 5000 at 0.0.0.0
- `npm run dev` - Start development server
- `npm run data:build` - Process raw data into JSON for the frontend
- `npm run data:sync` - Full data pipeline (sync upstream + build)

## Production Server (`server.js`)
A small Express server handles the production deployment:
- Serves the built static files from `dist/`
- On startup, automatically runs `data:sync` + `build` if no `dist/` exists
- Schedules a **nightly refresh at 3:00 AM UTC**: re-runs `data:sync` then `npm run build` in the background while continuing to serve the current build. This keeps legislation, hearings, and campaign finance data current without any manual intervention.
- Run command: `node server.js`

## Deployment
- VM deployment: `node server.js`
- The server handles all data sync and builds automatically — no separate build step needed
- Data refreshes nightly; each refresh pulls the latest nyc_legislation repo + downloads fresh campaign finance CSVs

## Routes
- `/` — Address lookup / Find My Member
- `/members` — Council member directory
- `/members/:id` — Member profile dashboard
- `/districts` — District map explorer
- `/bills` — Bill search and tracking
- `/hearings` — Upcoming and past hearings
- `/money` — Campaign finance comparison
- `/influence` — Influence Mapper (donor/lobbying analysis, Pro-gated conflict alerts)
- `/watchlist` — Personal watchlist (Clerk auth required)
- `/pricing` — Pro subscription plans
- `/support` — Donation / support page
- `*` — 404 NotFoundPage with navigation shortcuts

## Lobbying Data Pipeline
- `scripts/build-lobbying.ts` fetches NYC Open Data Socrata dataset `fmf3-knd8` (lobbying filings)
- Generates per-bill profiles in `public/data/lobbying/bills/*.json` and per-member profiles in `public/data/lobbying/members/*.json`
- Also generates `public/data/lobbying-index.json` and `data/processed/lobbying-index.json` (search index source)
- `LobbyingInsights` component displays lobbying data inside BillCard expanded summary (Pro-gated)
- `MemberDashboard` shows lobbying activity section at bottom (Pro-gated)
- `InfluenceMapperPage` shows full lobbying index with filterable table, supports `/influence?search=...` deep links
- `IndustryBadge` shared component with `INDUSTRY_COLORS` map for consistent industry theming

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
