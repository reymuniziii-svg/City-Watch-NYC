# Council Watch NYC Pro — Phase 2 Implementation (Issues #11–#18, #30–#31)

You are implementing the next 10 issues of the Council Watch NYC Pro Suite. The GitHub repo is `reymuniziii-svg/City-Watch-NYC` at `/Users/rey/Desktop/01-Active-Projects/City-Watch-NYC`. These issues complete Phase 1 (remaining #11, #12, #13, #30, #31) and begin Phase 2: Intelligence (#14, #15, #16, #17, #18).

## CRITICAL CONSTRAINT
**Do NOT break existing free-tier functionality.** Every existing route, component, and data pipeline must continue working exactly as before. Pro features are additive only. **Also do NOT break the Phase 1 Pro features** (Influence Mapper, Conflict Alerts, Pricing Page, Auth).

---

## Codebase Context (Post–Phase 1)

**Stack**: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Recharts, Leaflet, Motion, Fuse.js, Gemini AI, Clerk auth, Supabase, @supabase/supabase-js  
**Deployment**: Vercel (static build) + Express server.js for self-hosted  
**Data**: Build-time pipeline (scripts/*.ts) outputs static JSON to public/data/, frontend fetches via nycDataService.ts  
**AI**: Gemini 2.5 Flash (build-time in scripts/lib/ai.ts), Gemini 3 Flash Preview (runtime in src/services/geminiService.ts)  
**Auth**: Clerk (optional via VITE_CLERK_PUBLISHABLE_KEY), Supabase for data (optional via VITE_SUPABASE_URL)  
**CI/CD**: GitHub Actions — ci.yml (lint+build on push/PR), daily-sync.yml (6AM ET data refresh)

### Key Files — Entry Points & Config

| File | Purpose |
|------|---------|
| `src/main.tsx` | StrictMode, conditional ClerkProvider (only when VITE_CLERK_PUBLISHABLE_KEY set) |
| `src/App.tsx` | BrowserRouter with 11 routes: /, /members, /members/:id, /members/district/:district, /districts, /bills, /hearings, /money, /influence, /pricing, /support |
| `src/components/Layout.tsx` | Sidebar nav (8 items: Find My Member, Council Members, District Map, Bills, Hearings, Money, Influence, Pro), GlobalSearch, AuthButton, mobile responsive |
| `vite.config.ts` | Exposes GEMINI_API_KEY via define. VITE_* vars auto-exposed by Vite |
| `.env.example` | GEMINI_API_KEY, APP_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CLERK_PUBLISHABLE_KEY |

### Key Files — Auth & Pro Infrastructure

| File | Purpose |
|------|---------|
| `src/hooks/useProUser.ts` | Returns `{ isAuthenticated, isPro, isEnterprise, user, tier, isLoading }`. Uses build-time constant early return when Clerk absent. Queries Supabase `profiles.tier`. Exports `ProTier` type ('free' \| 'advocate' \| 'enterprise') |
| `src/components/ProGate.tsx` | Wraps children in blurred overlay + "Upgrade to Pro" CTA link to /pricing. Props: `children`, `feature` (string for CTA label). Checks `isPro` from `useProUser()` |
| `src/components/AuthButton.tsx` | Clerk SignInButton (modal) / UserButton. Returns null when Clerk not configured |
| `src/services/supabaseClient.ts` | `export const supabase: SupabaseClient \| null` (null when env vars missing), `export function isSupabaseConfigured(): boolean` |
| `src/services/watchlistService.ts` | `getWatchlist(userId)`, `addToWatchlist(userId, item)`, `removeFromWatchlist(userId, itemId)`, `isWatched(userId, itemType, itemValue)`. All return empty/false when Supabase not configured |

### Key Files — Data Layer

| File | Purpose |
|------|---------|
| `src/services/nycDataService.ts` | All data fetching. Pattern: cache variable → fetchJson<T>('/data/file.json') → map to types. Exports: fetchMembers, fetchBills, fetchHearings, fetchPastHearings, fetchHearingEnrichment, getCampaignFinance, fetchMemberMetrics, getMemberMetrics, fetchFinanceIndex, fetchMemberProfile, fetchInfluenceMap, fetchConflictAlerts |
| `src/lib/types.ts` | Canonical TypeScript types. Includes InfluenceMapEntry, ConflictAlert, MemberProfile, BillRecord, HearingRecord, MemberFinanceProfile, etc. |
| `src/types.ts` | Older frontend-facing types: CouncilMember, Bill, Hearing, CampaignFinance, FinanceIndexRow, MemberMetrics |

### Key Files — Build Pipeline

| File | Purpose |
|------|---------|
| `scripts/build-all.ts` | Orchestrator: buildDistricts → buildBills → generateSummaries → buildHearings → buildHearingEnrichment → publishHearingEnrichment → buildFinance → buildMetrics → buildMembers → buildFinanceIndex → buildInfluenceMap → buildConflictAlerts → buildSearchIndex |
| `scripts/lib/ai.ts` | Gemini structured JSON helper: `structuredJsonRequest({ scope, systemInstruction, userPrompt, responseJsonSchema, maxOutputTokens })`. Has retry logic, timeout handling, JSON normalization. Uses GEMINI_API_KEY env var |
| `scripts/lib/constants.ts` | ROOT_DIR, DATA_DIR, RAW_DIR, PROCESSED_DIR, PUBLIC_DATA_DIR, CONTENT_DIR, CFB URLs |

### Supabase Migrations (existing)

- `001_initial_schema.sql` — `profiles` table (id, email, display_name, tier, created_at, updated_at) with RLS
- `002_watchlists.sql` — `watchlist_items` table (id uuid, user_id, item_type, item_value, item_label, created_at) with RLS

### Supabase Edge Functions (existing)

- `supabase/functions/watchlist/index.ts` — GET/POST/DELETE for watchlist items (Deno runtime)

### UI Design System

- Motion: `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}`
- Tailwind: `clsx` + `tailwind-merge` (cn() utility in Layout.tsx)
- Icons: lucide-react
- Editorial: `border-editorial`, `font-editorial`, `text-[10px] font-bold uppercase tracking-widest` for labels
- Cards: white bg, `border-editorial`, hover states
- Buttons: `bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800`
- Color badges: INDUSTRY_COLORS pattern used in InfluenceMapperPage and ConflictAlertCard

---

## The 10 Issues — Organized by Execution Wave

### WAVE 1 — No dependencies on each other (parallel)

**Issue #30: Environment variable and secret management for Pro services**
- Create `scripts/check-env.ts` — validation script that checks required env vars and reports missing ones. Group by context (frontend, backend, optional). Make it runnable: `npx tsx scripts/check-env.ts`
- Update `.env.example` — add ALL new variables with comments:
  ```
  # Stripe (Pro billing)
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=
  STRIPE_ADVOCATE_PRICE_ID=
  STRIPE_ENTERPRISE_PRICE_ID=
  
  # Resend (email alerts)
  RESEND_API_KEY=
  ```
- Add `"check-env": "tsx scripts/check-env.ts"` to package.json scripts
- **Verify**: `npm run check-env` runs without crashing (shows warnings for missing optional vars, not errors)

**Issue #31: Pro feature flag system for gradual rollout**
- Create `src/lib/featureFlags.ts`:
  ```typescript
  import type { ProTier } from '../hooks/useProUser';
  
  export interface FeatureFlags {
    canViewConflictAlerts: boolean;
    canUseWatchlists: boolean;
    canReceiveAlerts: boolean;
    canUseImpactAnalysis: boolean;
    canUseSemanticSearch: boolean;
    canCreateActionKits: boolean;
    canAccessAPI: boolean;
  }
  
  export function getFeatureFlags(tier: ProTier): FeatureFlags {
    return {
      canViewConflictAlerts: tier === 'advocate' || tier === 'enterprise',
      canUseWatchlists: tier === 'advocate' || tier === 'enterprise',
      canReceiveAlerts: tier === 'advocate' || tier === 'enterprise',
      canUseImpactAnalysis: tier === 'advocate' || tier === 'enterprise',
      canUseSemanticSearch: tier === 'advocate' || tier === 'enterprise',
      canCreateActionKits: tier === 'enterprise',
      canAccessAPI: tier === 'enterprise',
    };
  }
  ```
- Create `src/hooks/useFeatureFlags.ts` — hook wrapping `getFeatureFlags(useProUser().tier)`
- Update `src/components/ProGate.tsx` to accept an optional `flag` prop (keyof FeatureFlags) as alternative to blanket `isPro` check. When `flag` is provided, check that specific feature flag. Fallback to `isPro` when no flag provided (backwards compatible).
- **Verify**: `npm run build` and `npm run lint` pass. Existing ProGate usage in InfluenceMapperPage still works.

**Issue #14: Stripe subscription billing with webhooks**
- Create `supabase/migrations/003_subscriptions.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id text PRIMARY KEY,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan text NOT NULL CHECK (plan IN ('advocate', 'enterprise')),
    status text NOT NULL DEFAULT 'active',
    current_period_end timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid()::text = user_id);
  ```
- Create `supabase/functions/create-checkout-session/index.ts` — Deno Edge Function:
  - Accepts POST with `{ plan: 'advocate' | 'enterprise' }` and `successUrl`, `cancelUrl`
  - Authenticates user via Supabase auth
  - Creates Stripe Checkout Session using Stripe SDK (import from esm.sh)
  - Returns `{ url: session.url }`
  - Uses env vars: STRIPE_SECRET_KEY, STRIPE_ADVOCATE_PRICE_ID, STRIPE_ENTERPRISE_PRICE_ID
- Create `supabase/functions/stripe-webhook/index.ts` — Deno Edge Function:
  - Verifies Stripe webhook signature (STRIPE_WEBHOOK_SECRET)
  - Handles: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`
  - Updates `subscriptions` table and `profiles.tier` accordingly
  - On deletion: sets tier back to 'free'
- Update `src/hooks/useProUser.ts` — after checking `profiles.tier`, ALSO check `subscriptions` table for active subscription. If subscription exists and is active, use its plan as the tier. This ensures real-time tier detection. Add a `subscriptionStatus` field to ProUserState.
- **Verify**: TypeScript compiles. Build passes without Stripe env vars.

### WAVE 2 — Depends on Wave 1

**Issue #15: Wire Stripe checkout into Pricing page** (depends on #14)
- Create `src/components/SubscriptionStatus.tsx` — shows current plan, renewal date, and "Manage Subscription" link (opens Stripe Customer Portal via another Edge Function or direct Stripe portal URL)
- Modify `src/components/PricingPage.tsx`:
  - Import `useProUser` and `isSupabaseConfigured`
  - When authenticated user clicks "Upgrade" on Advocate/Enterprise:
    - Call `supabase.functions.invoke('create-checkout-session', { body: { plan, successUrl: window.location.origin + '/pricing?success=true', cancelUrl: window.location.origin + '/pricing' } })`
    - Redirect to returned URL
  - Handle `?success=true` URL param to show success toast
  - Show `<SubscriptionStatus />` for subscribed users instead of "Current Plan" badge
  - Keep buttons disabled with "Coming soon" tooltip when Supabase is not configured (current behavior as fallback)
- **Verify**: Build passes. PricingPage still renders without Supabase.

**Issue #11: Watchlist UI — watch buttons and /watchlist page** (depends on Wave 1 auth infra)
- Create `src/components/WatchButton.tsx`:
  - Eye icon toggle (Eye / EyeOff from lucide-react)
  - Props: `itemType: 'bill' | 'member'`, `itemValue: string`, `itemLabel: string`
  - Uses `useProUser()` for auth check — if not authenticated, show sign-in prompt on click
  - Uses `addToWatchlist` / `removeFromWatchlist` / `isWatched` from watchlistService
  - Optimistic UI: toggle immediately, revert on error
  - Returns null when Supabase not configured
- Create `src/components/WatchlistPage.tsx`:
  - Groups watched items by type (bills, members, keywords)
  - Each item shows label, type badge, remove button, link to relevant page
  - Keyword section has text input to add custom keyword watches
  - Empty state when no items
  - Pro-gated via `<ProGate flag="canUseWatchlists">`
- Modify `src/components/BillCard.tsx` — add `<WatchButton>` in the header area (near the share button)
- Modify `src/components/MemberDashboard.tsx` — add `<WatchButton>` in the profile header (near the share button)
- Add `/watchlist` route to `src/App.tsx`
- Add nav item to Layout.tsx: `{ name: 'Watchlist', icon: Eye, path: '/watchlist' }` (add before Pro item)
- **Verify**: Build passes. BillCard and MemberDashboard still render without Supabase.

**Issue #16: Policy platform file upload storage** (depends on #14 for Pro check)
- Create `supabase/migrations/004_policy_platforms.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS policy_platforms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    filename text NOT NULL,
    storage_path text NOT NULL,
    file_type text NOT NULL CHECK (file_type IN ('pdf', 'txt')),
    file_size integer NOT NULL,
    status text DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'error')),
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE policy_platforms ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own platforms" ON policy_platforms FOR ALL USING (auth.uid()::text = user_id);
  ```
- Create `supabase/functions/upload-platform/index.ts` — Deno Edge Function:
  - Accepts multipart form upload
  - Validates: file type (PDF or TXT only), file size (≤ 10MB)
  - Stores in Supabase Storage bucket `policy-platforms` at path `{userId}/{uuid}/{filename}`
  - Creates record in `policy_platforms` table
  - Returns `{ id, filename, status }`
- Create `src/services/platformService.ts`:
  ```typescript
  export async function uploadPlatform(userId: string, file: File): Promise<{ id: string; filename: string }> { ... }
  export async function getUserPlatforms(userId: string): Promise<PolicyPlatform[]> { ... }
  export async function deletePlatform(userId: string, platformId: string): Promise<void> { ... }
  ```
  All functions return empty/throw when Supabase not configured.
- **Verify**: TypeScript compiles. Build passes.

### WAVE 3 — Depends on Wave 2

**Issue #12: Email alert subscription backend** (depends on #11 watchlist)
- Create `supabase/migrations/005_alert_preferences.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS alert_preferences (
    user_id text PRIMARY KEY,
    frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
    enabled boolean DEFAULT true,
    last_sent_at timestamptz,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own alert prefs" ON alert_preferences FOR ALL USING (auth.uid()::text = user_id);
  ```
- Create `supabase/functions/send-digest/index.ts` — Deno Edge Function:
  - Queries all users with `alert_preferences.enabled = true` whose `frequency` matches the call context
  - For each user, fetches their `watchlist_items`
  - Compares watched bill IDs against `bills-index.json` (fetch from the app's public URL or Supabase Storage) looking for `actionDate` changes since `last_sent_at`
  - Compares watched member slugs for new bills sponsored
  - Generates HTML email digest via Resend API (RESEND_API_KEY)
  - Updates `last_sent_at`
  - Designed to be called by Supabase cron or external scheduler
- Create `src/services/alertService.ts`:
  ```typescript
  export async function getAlertPreferences(userId: string): Promise<AlertPreferences | null> { ... }
  export async function updateAlertPreferences(userId: string, prefs: Partial<AlertPreferences>): Promise<void> { ... }
  ```
- **Verify**: TypeScript compiles.

**Issue #17: Custom Impact Analysis engine** (depends on #16 file upload)
- Create `supabase/migrations/006_impact_reports.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS impact_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    platform_id uuid REFERENCES policy_platforms(id),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
    report_json jsonb,
    error_message text,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE impact_reports ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own reports" ON impact_reports FOR ALL USING (auth.uid()::text = user_id);
  ```
- Create `supabase/functions/analyze-impact/index.ts` — Deno Edge Function:
  - Retrieves user's uploaded policy platform text (from Supabase Storage)
  - For PDF files: extract text using a simple PDF text extraction approach
  - Fetches bills-index.json from the app's public URL
  - Sends batched prompts to Gemini API (using same patterns as scripts/lib/ai.ts — retry logic, structured JSON output)
  - Each bill classified as: `Opportunity | Threat | Conflict | Neutral` with `reasoning` (string) and `confidence` (0-1 float)
  - Stores results in `impact_reports` table as JSONB
  - Batch size: 20 bills per Gemini request to avoid timeout
  - Schema: `{ results: Array<{ billId: string, introNumber: string, title: string, classification: string, reasoning: string, confidence: number }> }`
  - Verifies Pro subscription before running
- **Verify**: TypeScript compiles.

### WAVE 4 — Depends on Wave 3

**Issue #13: Email alert preferences UI** (depends on #12 backend, #11 watchlist page)
- Create `src/components/AlertPreferences.tsx`:
  - Toggle: daily vs weekly digest frequency (radio buttons or segmented control)
  - Enable/disable email alerts (toggle switch)
  - Shows last sent date if available
  - Uses `alertService.ts` to read/write preferences
  - For free users: wrap in `<ProGate flag="canReceiveAlerts">` showing locked upgrade prompt
- Modify `src/components/WatchlistPage.tsx` — add `<AlertPreferences />` section below the watchlist items
- **Verify**: Build passes. WatchlistPage still renders without Supabase.

**Issue #18: Impact Analysis PDF report generation** (depends on #17 analysis engine)
- Create `supabase/functions/generate-impact-pdf/index.ts` — Deno Edge Function:
  - Takes an `impact_report.id`
  - Retrieves report JSON from database
  - Generates PDF using `pdf-lib` (import from esm.sh):
    - Page 1: Executive summary
    - Organization name (from platform filename or user display name) and analysis date
    - Top Opportunities section (green): bills that align with platform, sorted by confidence
    - Top Threats section (red): bills that conflict, sorted by confidence
    - Key Conflicts section (amber): from influence map data for relevant members
    - Recommended Actions list
    - Council Watch NYC branding in footer
  - Stores PDF in Supabase Storage at `reports/{userId}/{reportId}.pdf`
  - Returns signed URL (1-hour expiry)
- **Verify**: Edge Function compiles (Deno syntax).

---

## Execution Strategy

Use **git worktree isolation** for parallel development within each wave.

**Wave 1** (3 parallel agents):
- Agent A: Issue #30 (env management) — touches: scripts/check-env.ts (new), .env.example, package.json
- Agent B: Issue #31 (feature flags) — touches: src/lib/featureFlags.ts (new), src/hooks/useFeatureFlags.ts (new), src/components/ProGate.tsx
- Agent C: Issue #14 (Stripe billing) — touches: supabase/migrations/003, supabase/functions/create-checkout-session (new), supabase/functions/stripe-webhook (new), src/hooks/useProUser.ts

**Wave 2** (3 parallel agents):
- Agent D: Issue #15 (Stripe pricing page) — touches: src/components/PricingPage.tsx, src/components/SubscriptionStatus.tsx (new)
- Agent E: Issue #11 (Watchlist UI) — touches: src/components/WatchButton.tsx (new), src/components/WatchlistPage.tsx (new), src/components/BillCard.tsx, src/components/MemberDashboard.tsx, src/App.tsx, src/components/Layout.tsx
- Agent F: Issue #16 (File upload) — touches: supabase/migrations/004 (new), supabase/functions/upload-platform (new), src/services/platformService.ts (new)

**Wave 3** (2 parallel agents):
- Agent G: Issue #12 (Email backend) — touches: supabase/migrations/005 (new), supabase/functions/send-digest (new), src/services/alertService.ts (new)
- Agent H: Issue #17 (Impact Analysis engine) — touches: supabase/migrations/006 (new), supabase/functions/analyze-impact (new)

**Wave 4** (2 parallel agents):
- Agent I: Issue #13 (Alert preferences UI) — touches: src/components/AlertPreferences.tsx (new), src/components/WatchlistPage.tsx
- Agent J: Issue #18 (PDF generation) — touches: supabase/functions/generate-impact-pdf (new)

After EACH wave, merge the worktree branches into main, run `npm run build && npm run lint` to verify, and resolve any merge conflicts before proceeding.

**Commit convention**: Each issue gets a dedicated branch `feat/issue-{N}-short-name`. Commit messages reference the issue: `feat(billing): add Stripe subscription with webhooks (closes #14)`.

## After All 10 Issues

Run the full verification:
1. `npm run build` — must pass
2. `npm run lint` — must pass
3. `npm run check-env` — must run without crashing
4. Visit every existing route (/, /members, /bills, /hearings, /money, /districts, /influence, /pricing) — must work unchanged
5. Visit /watchlist — new page renders
6. Check that PricingPage subscribe buttons attempt checkout when Supabase is configured
7. Check that WatchButton appears on BillCard and MemberDashboard (returns null gracefully when Supabase absent)
8. Check that ProGate works with both `feature` prop (existing) and new `flag` prop
9. Verify all Supabase migrations are valid SQL
10. Verify all Edge Functions are valid Deno TypeScript
