<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Council Watch NYC

Demystifying New York City's legislative process for everyday New Yorkers. Look up your council member by address, track bills moving through City Hall, follow campaign finance money, and stay informed about upcoming hearings -- all in one place.

## What It Does

- **Find Your Member** -- Enter any NYC address to identify your City Council district and representative via the NYC Planning Labs geosearch API and NYC Open Data district boundaries.
- **Council Member Profiles** -- View all 51 council members with photos, contact info, committee assignments, neighborhoods served, and an activity scorecard (bills sponsored, enacted, co-sponsorship rate, hearing activity).
- **Legislative Bill Tracker** -- Browse and search every bill in the current session. Bills include AI-generated plain-English explainers (what it does, who it affects, why it matters, what happens next) and full status timelines.
- **Campaign Finance** -- Per-member finance profiles sourced from the NYC Campaign Finance Board: total raised, public funds, small-dollar share, top donors, and industry breakdowns visualized with interactive charts.
- **Hearing Calendar** -- Upcoming committee hearings with agenda items, enriched with AI-generated summaries and key quotes scraped from CityMeetings.nyc transcripts.
- **District Explorer Map** -- Interactive Leaflet map of all 51 council districts. Click any district to jump to that member's dashboard.
- **Global Search** -- Fuse.js-powered fuzzy search across members, bills, and hearings from the sidebar.

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

### Data Pipeline (Build-Time Scripts)

All data is pre-built at build time via TypeScript scripts (`scripts/`) using `tsx`. No backend server is required at runtime -- the app serves static JSON from `public/data/`.

| Script | Purpose |
|--------|---------|
| `sync-upstream` | Shallow-clones [jehiah/nyc_legislation](https://github.com/jehiah/nyc_legislation) for raw legislative data |
| `build-districts` | Fetches council district GeoJSON boundaries from NYC Open Data |
| `build-bills` | Parses raw legislation files into a bills index |
| `build-hearings` | Parses upcoming hearing events and agenda items |
| `build-hearing-enrichment` | Scrapes CityMeetings.nyc for hearing summaries, then generates AI summaries via Gemini |
| `generate-summaries` | Generates plain-English bill explainers using Gemini (cached to avoid redundant API calls) |
| `build-finance` | Downloads NYC Campaign Finance Board CSVs (contributions, financial analysis, payments) and builds per-member finance profiles |
| `build-metrics` | Computes member activity scorecards (sponsorship counts, rankings, co-sponsorship rates) |
| `build-members` | Assembles the final members index with supplemental data (photos, parties, neighborhoods, socials) |
| `build-search-index` | Generates a combined search index across members, bills, and hearings |

### AI Integration

Gemini (Google) is used in two places:

1. **Build-time** (`scripts/lib/ai.ts`) -- Generates structured JSON bill summaries and hearing enrichments during the data pipeline. Uses the Gemini REST API directly with retry logic, structured JSON output, and response caching. Model defaults to `gemini-2.5-flash`.
2. **Client-side** (`src/services/geminiService.ts`) -- On-demand bill and hearing summarization using `@google/genai` SDK with `gemini-3-flash-preview`. Requires a `GEMINI_API_KEY` injected at build time via Vite.

### External Data Sources

| Source | What It Provides |
|--------|-----------------|
| [jehiah/nyc_legislation](https://github.com/jehiah/nyc_legislation) | Raw legislative data (bills, sponsors, events, votes) |
| [NYC Open Data](https://data.cityofnewyork.us) | Council district GeoJSON boundaries, district lookup by coordinates |
| [NYC Planning Labs Geosearch](https://geosearch.planninglabs.nyc) | Address autocomplete and geocoding |
| [NYC Campaign Finance Board](https://www.nyccfb.info) | Contribution CSVs, financial analysis, payments data |
| [CityMeetings.nyc](https://citymeetings.nyc) | Hearing transcripts and video links |

### CI/CD

- **CI** -- GitHub Actions runs on push to `main` and on PRs: checkout, Node 22 setup, `npm ci`, typecheck (`tsc --noEmit`), and `vite build`.
- **Daily Data Sync** -- Scheduled GitHub Action runs at 6:00 AM ET daily. Clones upstream legislation data, runs the full data pipeline (`npm run data:sync`), and auto-commits updated JSON files back to the repo.
- **Hosting** -- Deployed on Vercel (`.vercel/` config present).

## Project Structure

```
City-Watch-NYC/
  content/                  # Supplemental data (member photos/parties, finance overrides)
  data/
    raw/nyc_legislation/    # Cloned upstream legislative data (git-ignored)
    processed/              # Intermediate build artifacts (caches, enrichments)
  public/data/              # Static JSON served to the frontend
    bills-index.json
    districts-index.json
    district-map.geojson
    hearings-upcoming.json
    member-metrics.json
    members-index.json
    search-index.json
    finance/*.json          # Per-member campaign finance profiles
  scripts/                  # Data pipeline (TypeScript, run with tsx)
    lib/                    # Shared utilities (AI client, CSV parser, hashing, normalization)
  src/
    components/             # React components (pages + UI)
    lib/                    # Client-side types and search index
    services/               # Data fetching (static JSON) and Gemini client
```

## Getting Started

**Prerequisites:** Node.js 22+

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env.local` file with your Gemini API key (optional -- the app works without it, but AI summaries won't generate):
   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Build the data (first run requires cloning upstream data):
   ```
   npm run data:sync
   ```

4. Start the dev server:
   ```
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build via Vite |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | TypeScript type checking |
| `npm run data:build` | Rebuild all data without re-cloning upstream |
| `npm run data:bills` | Rebuild just the bills index |
| `npm run data:members` | Rebuild just the members index |
| `npm run data:finance` | Rebuild just the finance profiles |
| `npm run data:hearings` | Rebuild just the hearings data |
| `npm run data:metrics` | Rebuild just the member metrics |
| `npm run data:search` | Rebuild just the search index |

## License

This project is not currently licensed for redistribution. Legislative data sourced from public NYC government APIs and open-source repositories.
