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

## Environment Variables
- `GEMINI_API_KEY` - Required for AI features (bill summaries, chat assistant)
- `APP_URL` - The URL where the app is hosted

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
- `/support` — Donation / support page

## Known Issues / Notes
- Vite file watcher is configured to ignore `.local/**`, `data/**`, and `node_modules/**` to prevent reload loops from Replit's internal log files and the large raw data directory
- Tailwind CSS v4 content scanner is configured via `@source "!..."` in `src/index.css` to exclude `.local/`, `data/`, and `node_modules/`
- `GEMINI_API_KEY` is optional; fallback summaries are used when absent
