# Instant District Preview — Implementation Plan

## Context

The current landing page (`AddressSearch.tsx`) is a static hero with a search box. When a user enters an address, they're immediately navigated away to `/members/district/X`. There's no payoff on the landing page itself — the user must leave before seeing any value. This plan replaces the navigation with an **in-place morph** that reveals a personalized council member preview, making the search feel like a magic trick rather than a form submission.

## Scope

**One file modified:** `src/components/AddressSearch.tsx` (~190 lines currently, will grow to ~350-400 lines)

**Zero new files.** If the component exceeds ~400 lines, extract `DistrictPreviewCard` into `src/components/DistrictPreviewCard.tsx` as a follow-up.

**Zero backend/data changes.** All required data already exists in cached index files.

---

## 1. State Management

Add three state variables and one ref to `AddressSearch`:

```ts
const [preview, setPreview] = useState<DistrictPreview | null>(null);
const [previewLoading, setPreviewLoading] = useState(false);
const [previewError, setPreviewError] = useState<string | null>(null);
const inputRef = useRef<HTMLInputElement>(null);
```

View mode is derived: `preview !== null` = preview mode, otherwise hero mode. No separate mode variable.

**`DistrictPreview` interface** (defined at top of file):

```ts
interface DistrictPreview {
  member: CouncilMember;
  metrics: MemberMetrics | null;
  finance: CampaignFinance | null;
  hotBill: Bill | null;
  resolvedAddress: string;
  isVacant: boolean;
}
```

## 2. Data Fetching

**Modified flow:** Address selected -> `getDistrictFromBBL(bbl)` -> district number -> `loadPreview(district, addressLabel)` (replaces `navigate()`)

**`loadPreview` function** orchestrates parallel fetches from existing cached services:

```
Step 1 — Parallel (all cached after first call):
  Promise.all([
    fetchMembers(),          // members-index.json, ~25KB
    fetchMemberMetrics(),    // member-metrics.json, ~9KB  
    fetchBills(),            // bills-index.json, ~700KB
  ])

Step 2 — From results:
  - member = members.find(m => m.district === district)
  - metrics = allMetrics.find(m => m.slug === member.id)
  - hotBill = allBills.filter(leadSponsorSlug === member.id)
              .sort by introDate desc, take first

Step 3 — Sequential (needs slug from Step 1):
  getCampaignFinance(member.id)  // ~5-20KB, provides grassrootsGrade
```

**Race condition guard:** Use a `loadIdRef = useRef(0)` counter. Increment on each call, discard results where loadId !== current.

### Existing functions to reuse (no modifications needed)

| Function | File | Line |
|----------|------|------|
| `fetchMembers()` | `src/services/nycDataService.ts` | 102 |
| `fetchBills()` | `src/services/nycDataService.ts` | 118 |
| `fetchMemberMetrics()` | `src/services/nycDataService.ts` | 246 |
| `getCampaignFinance(slug)` | `src/services/nycDataService.ts` | 230 |
| `searchAddress(query)` | `src/services/nycDataService.ts` | 264 |
| `getDistrictFromBBL(bbl)` | `src/services/nycDataService.ts` | 270 |

### Existing patterns to copy into AddressSearch.tsx

| Pattern | Source | Lines |
|---------|--------|-------|
| `gradeColor(grade)` | `src/components/FinanceView.tsx` | 16-23 |
| Photo URL template | `src/services/nycDataService.ts` | 49 |
| Photo + district badge layout | `src/components/MemberDashboard.tsx` | 172-186 |
| Stat cell styling | `src/components/Scorecard.tsx` | 40-47 |

### New imports to add

```ts
import { Link } from 'react-router-dom';
import { fetchMembers, fetchBills, fetchMemberMetrics, getCampaignFinance } from '../services/nycDataService';
import { CouncilMember, Bill, CampaignFinance, MemberMetrics } from '../types';
// Additional icons:
import { X as XIcon, ChevronRight, Users } from 'lucide-react';
```

## 3. Animation Choreography

Four sequential phases. All animations use `motion/react` (already imported). The top-level container uses `<AnimatePresence mode="wait">` with three keyed children: `"hero"`, `"skeleton"`, `"preview"`.

### Phase 1: Hero Exit (0–300ms)

When address is selected and `previewLoading` becomes true:

| Element | Exit animation | Timing |
|---------|---------------|--------|
| Badge ("NYC Civic Empowerment") | `opacity: 0, y: -10` | 200ms |
| H1 headline | `opacity: 0, y: -20` | 250ms, delay 50ms |
| Subtitle paragraph | `opacity: 0, y: -10` | 200ms, delay 100ms |
| Feature cards grid | `opacity: 0, y: 20` | 250ms, delay 50ms |

The search form **stays visible** — it is NOT inside the AnimatePresence block.

### Phase 2: Search Bar Morph (200–500ms)

The search form wrapper gets a `layout` prop on its `motion.div`, so Framer Motion auto-animates its position when siblings exit. The container widens from `max-w-3xl` to `max-w-5xl`. A small "x" clear button appears inside the search input (visible only in preview/loading mode).

### Phase 3: Skeleton (300–800ms)

While `previewLoading && !preview`:

| Element | Enter animation | Timing |
|---------|----------------|--------|
| Skeleton card | `opacity: 0, y: 30` -> `opacity: 1, y: 0` | 400ms, delay 200ms |

Skeleton matches preview card layout with `animate-pulse` blocks: photo square, name bar, badge bars, 3 stat boxes, bill area lines.

### Phase 4: Preview Reveal (staggered, 0–600ms after data arrives)

Each sub-element enters with staggered delays:

| Element | Animation | Delay |
|---------|-----------|-------|
| Photo + district badge | `opacity: 0, scale: 0.9` -> `1, 1` | 0ms |
| Name + party badge | `opacity: 0, x: -20` -> `1, 0` | 100ms |
| Neighborhoods text | `opacity: 0, y: 10` -> `1, 0` | 200ms |
| Stat cell 1 (Bills) | `opacity: 0, y: 20` -> `1, 0` | 250ms |
| Stat cell 2 (Grade) | `opacity: 0, y: 20` -> `1, 0` | 300ms |
| Stat cell 3 (Top Industry) | `opacity: 0, y: 20` -> `1, 0` | 350ms |
| Hot bill card | `opacity: 0, height: 0` -> `1, auto` | 400ms |
| CTA buttons | `opacity: 0, y: 10` -> `1, 0` | 500ms |
| Contextual feature cards | `opacity: 0, y: 20`, stagger 50ms each | 550ms |

All use `easeOut` except hot bill which uses `easeInOut` for the height expansion.

### Reset Animation

"Search another address" triggers `handleReset()`:
- Preview exits: `opacity: 0, scale: 0.98` over 250ms
- Hero re-enters: `opacity: 0, y: 20` -> `1, 0` over 500ms (same as initial page load)
- Input gets focused via `inputRef.current?.focus()`

## 4. Responsive Layout

### Hero mode (unchanged)
- Container: `max-w-3xl mx-auto py-12 md:py-20 text-center`
- Feature cards: `grid-cols-1 md:grid-cols-3`

### Preview mode

Container widens: `max-w-5xl mx-auto py-8 md:py-12`

**Desktop (md+):**
```
┌─────────────────────────────────────────────────┐
│ [Search input ·····················] [Search] [×]│
├─────────────────────────────────────────────────┤
│ ┌──────────┐  [Party]                           │
│ │  Photo   │  Member Name (serif, 5xl)          │
│ │ 160x160  │  Representing: neighborhoods       │
│ │  [Dist]  │  ┌─────────┬──────────┬──────────┐│
│ └──────────┘  │ Bills 14 │ Grade B+ │ Real Est ││
│               └─────────┴──────────┴──────────┘│
│ ┌───────────────────────────────────────────────┐│
│ │ INT 0123  [In Committee]          Latest Bill ││
│ │ "A Local Law to amend..."                     ││
│ └───────────────────────────────────────────────┘│
│ [See full profile →]        Search another addr  │
├─────────────────────────────────────────────────┤
│ [Contextual] [Contextual] [Contextual]          │
│ [Card 1    ] [Card 2    ] [Card 3    ]          │
└─────────────────────────────────────────────────┘
```

- Preview card: `flex flex-col md:flex-row gap-8 items-center md:items-start`
- Photo: `w-32 h-32 md:w-40 md:h-40` (compact vs MemberDashboard's `w-48 md:w-56`)
- District badge: `w-12 h-12` (smaller than dashboard's `w-16 h-16`)
- Name: `text-4xl md:text-5xl` (vs dashboard's `text-5xl md:text-7xl`)
- Stats: `grid grid-cols-3 gap-0 border-editorial` — stays 3-across on all screens

**Mobile:**
- Photo centered, name centered below
- Stats remain 3-across (compact numbers fit)
- Hot bill full width
- CTAs stacked: primary CTA full width, "Search again" below
- Feature cards: `grid-cols-1`

## 5. Contextual Feature Cards

When `preview` is set, the 3 feature cards morph from generic to personalized:

| Default | Contextual |
|---------|-----------|
| "Track Bills" / generic desc | "[LastName] sponsored [N] bills" / "Track every bill your council member has introduced..." |
| "Follow Money" / generic desc | "Follow [LastName]'s money" / "[Name] raised $[X] from [N] contributors." |
| "Attend Hearings" / generic desc | "Hearings in District [N]" / "Stay informed about upcoming committee meetings..." |

Same icons (FileText, Landmark, Calendar). Same grid layout and editorial styling.

## 6. Edge Cases

| Case | Detection | Handling |
|------|-----------|---------|
| Vacant seat | No member in index for district | Preview with "District N is currently vacant", link to `/members/district/N`, no stats/bill/finance |
| No finance data | `getCampaignFinance` returns null | Grade cell shows "N/A" in slate, Top Industry shows "N/A", feature card uses generic text |
| No bills | No bill with matching `leadSponsorSlug` | Hot bill section not rendered, feature card says "No bills sponsored yet" |
| Network error | Fetch throws | `previewError` set, show error banner below search with "Try again" button |
| Rapid address switching | New address selected before prior loads | `loadIdRef` counter pattern — discard stale results |
| New search while preview shown | User types in search box | Suggestions dropdown appears over preview (z-50). Selecting triggers new `loadPreview`, skeleton replaces preview |

## 7. `handleReset` Function

```ts
const handleReset = () => {
  setPreview(null);
  setPreviewLoading(false);
  setPreviewError(null);
  setQuery('');
  inputRef.current?.focus();
};
```

Two triggers: "Search another address" text button, and an X icon button appended to search input in preview mode.

## 8. Implementation Sequence

1. Add `DistrictPreview` interface and new imports
2. Add state variables (`preview`, `previewLoading`, `previewError`) and `inputRef`
3. Add `gradeColor()` utility (copy from FinanceView.tsx:16-23)
4. Write `loadPreview(district, addressLabel)` async function
5. Modify `handleSelect` — replace `navigate()` with `loadPreview()`
6. Add `handleReset` function
7. Restructure JSX: wrap hero content in `AnimatePresence mode="wait"` with keyed states
8. Add `layout` prop to search form's motion wrapper
9. Build skeleton loading state (inline, `animate-pulse` blocks)
10. Build preview card with staggered `motion.div` wrappers
11. Build contextual feature cards (conditional on `preview`)
12. Add X clear button to search input (visible only in preview/loading mode)
13. Test all edge cases and responsive breakpoints

## 9. Verification

1. `npm run build` — confirm no TypeScript errors
2. `npm run dev` — open in browser
3. **Golden path:** Enter a valid NYC address -> see skeleton -> see preview with photo, name, stats, grade, hot bill -> click "See full profile" -> navigates to member dashboard
4. **Reset flow:** Click "Search another address" -> hero re-appears with animation -> search input focused
5. **Mobile:** Resize to mobile width -> verify stacked layout, 3 stat cells still readable, CTAs stacked
6. **Edge cases:** Try an address with a vacant district, a member with no finance data, rapid address switching
7. **Animation quality:** Verify stagger timing feels natural, no layout jumps, skeleton-to-preview transition is smooth
