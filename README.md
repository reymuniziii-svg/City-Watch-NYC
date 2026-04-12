
# Council Watch NYC

A civic intelligence platform that demystifies New York City's legislative process for everyday New Yorkers, journalists, and advocacy organizations. Look up your council member by address, track bills moving through City Hall, follow campaign finance money, investigate donor-to-legislator influence networks, and stay informed about upcoming hearings -- all in one place.

## What It Does

### Free Tier

- **Find Your Member** -- Enter any NYC address and get an instant animated district preview showing your City Council representative, powered by NYC Planning Labs geosearch API and NYC Open Data district boundaries. Includes debounced address autocomplete with suggestion dropdowns.
- **Council Member Profiles** -- View all 51 council members with photos, contact info, committee assignments, neighborhoods served, and an activity scorecard (bills sponsored, enacted, co-sponsorship rate, hearing activity). Member dashboards include tabs for activity feed, legislative history, campaign finance, and hearing participation.
- **Legislative Bill Tracker** -- Browse and search every bill in the current session. Bills include AI-generated plain-English explainers (what it does, who it affects, why it matters, what happens next) and full status timelines.
- **Civic Action Center** -- Take action on any bill: find your council member by address, toggle support or oppose, send a pre-filled email via mailto, and share bills on WhatsApp, X/Twitter, Instagram (clipboard copy with toast), or via the native Web Share API on mobile.
- **Campaign Finance** -- Per-member finance profiles sourced from the NYC Campaign Finance Board: total raised, public funds, small-dollar share, grassroots grade, top donors, industry breakdowns visualized with interactive charts, and a "How They Spend" section with expenditure category breakdown and top payees.
- **Hearing Calendar** -- Upcoming committee hearings with agenda items, enriched with AI-generated summaries and key quotes scraped from CityMeetings.nyc transcripts. Past 90 days of hearings include real sourced quotes with speaker attribution and links to CityMeetings.nyc.
- **District Explorer Map** -- Interactive Leaflet map of all 51 council districts. Click any district to jump to that member's dashboard.
- **Global Search** -- Fuse.js-powered fuzzy search across members, bills, and hearings from the sidebar and a mobile search drawer.
- **AI Chat Assistant** -- Floating chat widget powered by Gemini for asking questions about NYC legislation, council members, and how local government works.
- **AI Source Citations** -- Every AI-generated summary includes a collapsible "View AI source data" disclosure showing the exact data inputs the AI received, so journalists and residents can verify the basis of each explainer.
- **Donation / Support Page** -- Independently funded project with Stripe Payment Links for one-time and monthly contributions.

### Pro Tier (Advocate & Enterprise)

- **Influence Mapper** -- Sortable, filterable table mapping campaign donors to council member sponsors and the bills they introduce. Visualize donor-to-legislator-to-legislation networks by industry, borough, and amount.
- **Conflict Alerts** -- Automated detection of temporal proximity between campaign donations and bill introductions in related industries (e.g., real estate donation followed by a zoning bill). Pro-gated with blur overlay.
- **Watchlist** -- Watch specific bills, council members, and keywords. Grouped views with optimistic UI toggles.
- **Email Digest Alerts** -- Configure daily or weekly email digests for watchlist activity via Resend.
- **Policy Platform Upload** -- Upload your organization's policy platform (PDF/TXT) to Supabase Storage for impact analysis.
- **AI Impact Analysis** -- Gemini-powered engine that classifies active council bills against your uploaded policy platform as Opportunities, Threats, or Conflicts, sorted by confidence score.
- **Impact Analysis PDF Reports** -- Generate branded PDF reports of impact analysis results with color-coded sections, executive summary, and classification counts via pdf-lib.

## Tech Stack

### Frontend

| Layer | Technology |
|-------|------------|
| Framework | React 19 with TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| Animations | Motion (Framer Motion) |
| Charts | Recharts (pie charts, bar charts for finance data) |
| Maps | Leaflet + React-Leaflet (district GeoJSON overlay) |
| Icons | Lucide React |
| Search | Fuse.js (client-side fuzzy search) |
| Markdown | react-markdown |
| Build | Vite 6 |

### Backend Services

| Service | Technology | Purpose |
|---------|------------|---------|
| Authentication | Clerk | User sign-in/sign-up with JWT-based auth; graceful degradation when key is absent |
| Database | Supabase (PostgreSQL) | User profiles, watchlists, subscriptions, policy platforms, alert preferences, impact reports |
| Edge Functions | Supabase (Deno) | 9 serverless functions for all authenticated operations |
| Payments | Stripe | Subscription billing -- Advocate ($9/mo, $89/yr) and Enterprise ($29/mo, $279/yr) |
| Email | Resend | Transactional email digests for watchlist alerts |
| Storage | Supabase Storage | Policy platform file uploads and generated PDF reports |
| Feature Flags | Custom system | Per-feature ProGate gating with tier-aware blur overlays |

### Supabase Edge Functions (9 deployed)

| Function | Methods | Purpose |
|----------|---------|---------|
| `watchlist` | GET/POST/DELETE | CRUD for user watchlist items |
| `get-user-profile` | GET | Fetch profile + subscription; auto-creates profile on first sign-in |
| `alert-preferences` | GET/POST | Manage email digest frequency (daily/weekly) |
| `analyze-impact` | POST | AI policy impact analysis against uploaded platform (Pro-gated) |
| `generate-impact-pdf` | POST | Generate PDF report from impact analysis results |
| `upload-platform` | GET/POST/DELETE | Upload, list, and delete policy platform files |
| `create-checkout-session` | POST | Create Stripe Checkout session for subscription |
| `stripe-webhook` | POST | Handle Stripe subscription lifecycle events |
| `send-digest` | POST | Generate and send email digests via Resend |

All edge functions validate Clerk JWTs via JWKS (`_shared/auth.ts`) and use the Supabase service-role client.

### Database Schema (6 migrations)

| Migration | Table | Purpose |
|-----------|-------|---------|
| 001 | `profiles` | User accounts (email, display name, tier) |
| 002 | `watchlist_items` | Bills, members, and keywords a user watches |
| 003 | `subscriptions` | Stripe subscription state (plan, status, period) |
| 004 | `policy_platforms` | Uploaded policy documents metadata |
| 005 | `alert_preferences` | Email notification frequency settings |
| 006 | `impact_reports` | AI impact analysis results |

### Data Pipeline (Build-Time Scripts)

All data is pre-built at build time via TypeScript scripts (`scripts/`) using `tsx`. No backend server is required at runtime for core features -- the app serves static JSON from `public/data/`.

| Script | Purpose |
|--------|---------|
| `sync-upstream` | Shallow-clones [jehiah/nyc_legislation](https://github.com/jehiah/nyc_legislation) for raw legislative data |
| `build-districts` | Fetches council district GeoJSON boundaries from NYC Open Data |
| `build-bills` | Parses raw legislation files into a bills index |
| `build-hearings` | Parses hearing events (upcoming 30 days + past 90 days) |
| `build-hearing-enrichment` | Scrapes CityMeetings.nyc for hearing transcripts, then generates AI summaries via Gemini |
| `generate-summaries` | Generates plain-English bill explainers using Gemini (cached to avoid redundant API calls) |
| `build-finance` | Downloads NYC Campaign Finance Board CSVs (contributions, expenditures, financial analysis, payments) and builds per-member finance profiles with grassroots grades, industry breakdowns, and expenditure categories |
| `build-influence-map` | Maps campaign donors to bill sponsors, detects industry-topic overlaps, and generates 30-day conflict alerts |
| `build-metrics` | Computes member activity scorecards (sponsorship counts, rankings, co-sponsorship rates) |
| `build-members` | Assembles the final members index with supplemental data (photos, parties, neighborhoods, socials) |
| `build-search-index` | Generates a combined Fuse.js search index across members, bills, and hearings |
| `check-env` | Validates that required environment variables are set |

### AI Integration

Gemini (Google) is used in three places:

1. **Build-time** (`scripts/lib/ai.ts`) -- Generates structured JSON bill summaries and hearing enrichments during the data pipeline. Uses the Gemini REST API directly with retry logic, structured JSON output, and response caching. Model defaults to `gemini-2.5-flash`.
2. **Client-side chat & summaries** (`src/services/geminiService.ts`) -- On-demand bill and hearing summarization plus a conversational chat assistant, using `@google/genai` SDK. Requires a `GEMINI_API_KEY` injected at build time via Vite.
3. **Server-side impact analysis** (`supabase/functions/analyze-impact`) -- Classifies council bills against uploaded policy platforms using batched Gemini API calls in a Deno edge function, gated behind Pro subscription.

### External Data Sources

| Source | What It Provides |
|--------|-----------------|
| [jehiah/nyc_legislation](https://github.com/jehiah/nyc_legislation) | Raw legislative data (bills, sponsors, events, votes) |
| [NYC Open Data](https://data.cityofnewyork.us) | Council district GeoJSON boundaries, district lookup by coordinates |
| [NYC Planning Labs Geosearch](https://geosearch.planninglabs.nyc) | Address autocomplete and geocoding |
| [NYC Campaign Finance Board](https://www.nyccfb.info) | Contribution CSVs, expenditure CSVs, financial analysis, payments data |
| [CityMeetings.nyc](https://citymeetings.nyc) | Hearing transcripts and video links |
| [Gemini API](https://ai.google.dev) | AI bill summaries, hearing enrichment, chat assistant, impact analysis |
| [Clerk](https://clerk.com) | User authentication (JWT/JWKS) |
| [Stripe](https://stripe.com) | Subscription billing and webhook events |
| [Resend](https://resend.com) | Transactional email delivery |

### CI/CD

- **CI** -- GitHub Actions runs on push to `main` and on PRs: checkout, Node 22 setup, `npm ci`, typecheck (`tsc --noEmit`), and `vite build`.
- **Daily Data Sync** -- Scheduled GitHub Action runs at 6:00 AM ET daily. Clones upstream legislation data, runs the full data pipeline (`npm run data:sync`), and auto-commits updated JSON files back to the repo.
- **Production Server** -- An Express server (`server.js`) serves the built static files, auto-runs `data:sync` + `build` on first start if no `dist/` exists, and schedules a nightly data refresh at 3:00 AM UTC.
- **Hosting** -- Deployed on Vercel (`.vercel/` config present) with self-hosted option via `node server.js`.

## Project Structure

```
City-Watch-NYC/
  .github/workflows/           # CI + daily data sync GitHub Actions
  content/                     # Supplemental data (member photos/parties, finance overrides)
  data/
    raw/nyc_legislation/       # Cloned upstream legislative data (git-ignored)
    processed/                 # Intermediate build artifacts (caches, enrichments)
  docs/                        # Implementation plans and design docs
  public/data/                 # Static JSON served to the frontend
    bills-index.json
    districts-index.json
    district-map.geojson
    hearings-upcoming.json
    hearings-past.json
    hearing-enrichment.json
    member-metrics.json
    members-index.json
    search-index.json
    influence-map.json
    conflict-alerts.json
    finance/*.json             # Per-member campaign finance profiles
  scripts/                     # Data pipeline (TypeScript, run with tsx)
    lib/                       # Shared utilities (AI client, CSV parser, hashing, normalization, committee topics)
    build-influence-map.ts     # Donor-to-sponsor mapping + conflict alert detection
  src/
    components/                # React components (pages + UI)
      AddressSearch.tsx        # Address lookup with instant district preview
      BillCard.tsx             # Bill card with AI summary, civic action center, share
      ChatAssistant.tsx        # Floating AI chat widget
      CivicActionCenter.tsx    # Contact CM + social sharing
      InfluenceMapperPage.tsx  # Donor influence network + conflict alerts
      WatchlistPage.tsx        # Personal watchlist + alert preferences
      PricingPage.tsx          # Subscription tiers with Stripe checkout
      ProGate.tsx              # Feature paywall with blur overlay
      SourceContext.tsx         # AI source citation disclosure
      ...                      # 29 components total
    hooks/                     # useMyCM (council member lookup)
    lib/                       # Client-side types, feature flags, search index
    services/                  # Data fetching, Gemini client, Supabase client, watchlist/alert/platform services
    data/                      # Donation config
  supabase/
    functions/                 # 9 Deno edge functions + shared auth module
    migrations/                # 6 PostgreSQL migrations
  server.js                    # Express production server with nightly data refresh
```

## Routes

| Path | Page | Auth Required |
|------|------|---------------|
| `/` | Address lookup / Find My Member | No |
| `/members` | Council member directory | No |
| `/members/:id` | Member profile dashboard | No |
| `/members/district/:district` | Member by district | No |
| `/districts` | District map explorer | No |
| `/bills` | Bill search and tracking | No |
| `/hearings` | Upcoming and past hearings | No |
| `/money` | Campaign finance comparison | No |
| `/influence` | Influence mapper + conflict alerts | No (Pro-gated sections) |
| `/watchlist` | Personal watchlist | Yes (Clerk) |
| `/pricing` | Pro subscription plans | No |
| `/support` | Donation / support page | No |

## Getting Started

**Prerequisites:** Node.js 22+

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env.local` file (see `.env.example`):
   ```
   GEMINI_API_KEY=your_key_here
   ```
   The app works without any environment variables -- AI summaries require `GEMINI_API_KEY`, and Pro/auth features require Clerk + Supabase keys.

3. Build the data (first run requires cloning upstream data):
   ```
   npm run data:sync
   ```

4. Start the dev server:
   ```
   npm run dev
   ```

   The app will be available at `http://localhost:5000`.

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | For AI features | Gemini API key for summaries, chat, and impact analysis |
| `APP_URL` | For emails | The URL where the app is hosted |
| `VITE_SUPABASE_URL` | For Pro features | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For Pro features | Supabase anonymous/public key |
| `VITE_CLERK_PUBLISHABLE_KEY` | For auth | Clerk publishable key (auth disabled when absent) |
| `SUPABASE_PROJECT_REF` | For CLI ops | Supabase project reference ID |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key (set as Supabase secret) |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_ADVOCATE_PRICE_ID` | For billing | Stripe price ID for Advocate plan |
| `STRIPE_ADVOCATE_YEARLY_PRICE_ID` | For billing | Stripe price ID for Advocate yearly |
| `STRIPE_ENTERPRISE_PRICE_ID` | For billing | Stripe price ID for Enterprise plan |
| `STRIPE_ENTERPRISE_YEARLY_PRICE_ID` | For billing | Stripe price ID for Enterprise yearly |
| `RESEND_API_KEY` | For email alerts | Resend API key for digest emails |
| `RESEND_FROM_EMAIL` | For email alerts | Sender address for digest emails |
| `CLERK_JWKS_URL` | For edge functions | Clerk JWKS endpoint (set as Supabase secret) |

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5000) |
| `npm run build` | Production build via Vite |
| `npm run start` | Production server with nightly data refresh |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | TypeScript type checking |
| `npm run check-env` | Validate environment variables |
| `npm run data:sync` | Full pipeline: clone upstream + rebuild all data |
| `npm run data:build` | Rebuild all data without re-cloning upstream |
| `npm run data:bills` | Rebuild just the bills index |
| `npm run data:members` | Rebuild just the members index |
| `npm run data:finance` | Rebuild just the finance profiles |
| `npm run data:hearings` | Rebuild just the hearings data |
| `npm run data:hearing-enrichment` | Rebuild hearing enrichments (scrape + AI) |
| `npm run data:metrics` | Rebuild just the member metrics |
| `npm run data:search` | Rebuild just the search index |
| `npm run data:districts` | Rebuild just the district boundaries |

## Mobile Optimization

The app is fully responsive with mobile-specific optimizations:
- Responsive padding (`p-4 md:p-8`) across all major cards
- Flex-wrap action buttons to prevent overflow on narrow screens
- Sticky tab bar offset for mobile header in MemberDashboard
- Dedicated mobile card-list view for MoneyPage (table hidden on small screens)
- Slide-down search drawer from mobile header
- Chat assistant FAB repositioned for mobile (`bottom-3 right-3`)
- ScrollToTop button positioned to avoid overlap with chat FAB

## License

This project is not currently licensed for redistribution. Legislative data sourced from public NYC government APIs and open-source repositories.
