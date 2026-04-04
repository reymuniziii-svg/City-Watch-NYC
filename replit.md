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

## Deployment
- Static site deployment via `npm run build` → `dist/` directory
- Note: Data must be built first (`npm run data:build`) before a full production build
