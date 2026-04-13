# Council Watch NYC — UX/UI Design Brief

> **For the designer:** This brief describes **what the product does and who it serves**, deliberately without describing how it currently looks. Please do not visit the live site or open the current app before doing your initial concept work — we want a fresh reimagining, not a refresh. You'll get access to the current build later, once your direction is locked.

---

## 1. The product in one sentence

Council Watch NYC is a civic transparency platform that makes the NYC City Council — its 51 members, every bill, every hearing, every dollar of campaign finance — legible to ordinary New Yorkers, and gives advocates and journalists the tools to turn that information into action.

## 2. Why it exists

NYC local government makes decisions that affect rent, schools, policing, sanitation, small business, and zoning — but the official sources (Legistar, the CFB website, CityMeetings.nyc, Open Data portals) are fragmented, jargon-heavy, and effectively hostile to non-specialists. A resident who wants to know "what's my council member doing, who's paying them, and how do I tell them what I think about it?" has to cross-reference five different government websites and understand legislative procedure to get an answer.

Council Watch unifies all of that into one product with AI-powered plain-English layering on top, so the baseline cost of civic awareness drops to near zero.

## 3. Who it's for

The product serves **three distinct user types**, and the interface needs to work for all of them without feeling like three different products stitched together.

### Persona A — "The Resident" (free tier, largest audience)
- A New Yorker who just wants to know who represents them, what their rep is doing, and occasionally take action on an issue they care about.
- Arrives by Googling their council member, sharing a link from a friend, or hearing about a specific bill.
- Low baseline civic knowledge. Doesn't know what "intro number" or "laid over" means. Needs jargon translated.
- Success looks like: lands on the site, finds their member in under 10 seconds, understands what's happening, and either leaves informed or contacts their rep.
- Mostly on mobile. Sessions are short.

### Persona B — "The Advocate" (paid tier — "Advocate", $9/mo)
- A civic power user: organizer, activist, small advocacy nonprofit staffer, an engaged constituent who follows multiple issues.
- Tracks specific bills, members, or topics over weeks/months. Wants alerts when things change.
- Wants to understand *why* a member votes the way they do — the money trail, the donor connections, the conflicts.
- Success looks like: returns weekly, has an active watchlist, receives alerts that matter, uses the Influence Mapper to investigate.
- Mix of desktop and mobile.

### Persona C — "The Professional" (paid tier — "Enterprise", $29/mo)
- A journalist, newsroom researcher, policy shop, advocacy organization communications lead, or in-house government affairs person.
- Needs to run their own analyses (e.g. "how do all 100 bills in this session affect my organization's policy platform?"), produce shareable artifacts (PDF reports, public microsites), and mobilize their own audiences.
- Uses the product as a professional tool, not a civic utility. Expects efficiency, bulk operations, export, API access.
- Primarily desktop.

**Designer implication:** The free experience needs to feel welcoming, explanatory, and as frictionless as Google Maps. The paid experience needs to feel like a serious professional tool — dense, powerful, and trustworthy. The transition between them should be a single coherent product, not two modes.

## 4. Jobs-to-be-done

Every screen in the product exists to serve one of these jobs. If a design doesn't clearly serve at least one, it shouldn't ship.

### For residents
1. **"Who represents me?"** — Enter an address, get a council member.
2. **"What is my member doing?"** — See their bills, hearings, votes, scorecard, contact info.
3. **"What does this bill actually mean for me?"** — Read a plain-English explainer of a bill written in everyday language.
4. **"When and where are hearings?"** — Find upcoming committee hearings, understand what's on the agenda.
5. **"Who's funding my representative?"** — See campaign finance: totals, top donors, industry breakdowns, small-dollar share, public funds.
6. **"How do I tell my council member what I think?"** — Contact them: email template, phone script, share links.

### For advocates
7. **"Tell me when something changes."** — Watch a bill, member, topic keyword, or hearing keyword; get email alerts.
8. **"Show me who's influencing whom."** — Explore donor → member relationships across all 51 districts, filter by industry and borough, spot patterns.
9. **"Flag conflicts of interest."** — Surface cases where a donor gave money to a member within days of that member voting on legislation relevant to the donor's industry.
10. **"Search what was actually said in hearings."** — Find specific quotes from testimony by keyword or by meaning ("where has anyone talked about displacement from rezoning?"), with sentiment scoring.

### For professionals
11. **"Run my whole policy platform against every active bill."** — Upload a position paper / policy document, get back a per-bill classification (opportunity / threat / conflict / neutral) with reasoning and a downloadable PDF report.
12. **"Launch a campaign microsite in 10 minutes."** — Build a branded, public-facing action page around a curated list of bills, with pre-written email and call-to-action templates and analytics on views and conversions.
13. **"Give me a dashboard of my active work."** — One place to see my recent reports, my watchlist, my action kits, my alert settings.

## 5. Functional inventory

These are the capabilities the product must express. The designer is free to reorganize, merge, split, or rename any of them — the labels below are descriptive, not prescriptive.

### 5.1 Find-My-Member
- Address autocomplete (NYC-only), resolves to a council district, routes to that member's profile.
- Entry point for the entire product.

### 5.2 Council Member Directory
- All 51 members, browsable and searchable by name, borough, or neighborhood.
- Each entry shows a photo, name, district number, party, neighborhoods.
- Serves as an alternative to address lookup.

### 5.3 Member Profile (the "hub" page — the single most important screen)
- Identity: photo, name, district, party, neighborhoods represented, contact info (email, phone, website, Twitter/X), share and watch actions.
- **Activity** view: a scorecard (bills sponsored, bills enacted, co-sponsorship rate, hearing activity, rank out of 51) + a recent activity feed of bill actions.
- **Bills** view: every bill this member has sponsored in the current session, with filtering.
- **Hearings** view: upcoming committee hearings for committees they sit on or chair.
- **Money** view: campaign finance breakdown (total raised, public funds, small-dollar share, top donors, industry mix with charts).
- **Influence connections** module: top donor→bill relationships specific to this member (free preview of the paid Influence Mapper).
- **Conflict alerts** module: if the member has any donor/bill timing conflicts flagged, surface them here.

### 5.4 District Map
- Interactive map of all 51 NYC council districts with GeoJSON boundaries.
- Click any district to jump to that member's profile.

### 5.5 Bill Tracker
- Every bill in the current council session, searchable and sortable (newest, oldest, most sponsors).
- Each bill has: intro number, title, status, sponsors, committee, last action date.
- On-demand **AI plain-English explainer** per bill: "what it does," "who it affects," "why it matters," "what happens next."
- "Semantic search" option: user types a topic (e.g. "housing displacement") and the AI expands it into 10–15 related keywords to broaden matching.
- Each bill card has a **Civic Action Center** that opens inline — contact-your-member flow with email templates (support or oppose), call scripts, and share links.
- Bills are watchable (free preview / paid gated).

### 5.6 Hearing Calendar
- Upcoming and past hearings, with agenda items (which bills), committee, date/time, location, Legistar link.
- On-demand **AI summary** of upcoming hearings based on the bills on the agenda.
- Past hearings carry pre-built enrichment: outcome type (vote/action, oversight, testimony), AI summary, key quotes from the transcript.

### 5.7 Hearing Transcript Super Search
- Full-text keyword search across hearing transcripts (free).
- **Semantic search** across transcripts — user enters a concept, gets back excerpts ranked by similarity (paid).
- Each result shows: speaker, body/committee, date, excerpt, sentiment (supportive/opposed/neutral/contentious) with intensity, link to the timestamped video chapter on CityMeetings.nyc.

### 5.8 Campaign Finance (money) page
- Sortable table comparing all 51 members across finance metrics: total raised, public funds share, small-dollar share, top-10 donor concentration, avg contribution, contributor count, real estate share.
- Click any row to dive into that member's detailed finance view.

### 5.9 Influence Mapper (paid)
- Table/graph of the highest-value donor→member relationships across the council.
- Filters: industry, borough, member name.
- Each row: donor name, industry, council member, district, total donated, number of bills from that member that relate to the donor's industry.
- Expandable rows to show the specific related bills.

### 5.10 Conflict-of-Interest Alerts (paid)
- Surfaces cases where a donation arrived within a suspiciously short window of the member taking action on industry-relevant legislation.
- Each alert shows: member, donor, donor's industry, donation amount and date, the related bill, and the "days delta" between donation and action.
- Color-coded severity by how tight the timing is.
- Appears both as a global stream on the Influence Mapper page and as a per-member module on each Member Profile.

### 5.11 Impact Analysis (paid — "Enterprise" headline feature)
- User uploads a policy platform document (PDF, Word, etc.).
- The system AI-classifies every active bill against that platform into one of four buckets: **Opportunity, Threat, Conflict, Neutral**, with per-bill reasoning and a confidence score.
- Results grouped by classification, displayed as cards.
- Output is a downloadable **PDF report** branded with the user's org.
- Report history: every report the user has run is saved and re-openable.
- Status lifecycle: pending → processing → complete → error.

### 5.12 Watchlist (paid)
- Users add items to a watchlist: specific bills, specific members, text keywords (match bill titles/summaries), or hearing keywords (match transcript content).
- Dedicated page to view and manage the list.
- "Watch" buttons appear inline throughout the product — on any bill, member, hearing result.
- Feeds into the email alert system.

### 5.13 Email Alerts (paid)
- Configurable email digest: on/off, daily or weekly cadence.
- Notifies the user when anything on their watchlist changes: a watched bill moves status, a watched member takes action, a new bill matches a watched keyword, a new hearing matches a watched keyword.

### 5.14 Action Kits (paid — "Enterprise" headline feature)
- A kit-builder: name a kit, pick a list of bills from the catalog, choose a call-to-action type (email / call / both), set primary brand color and logo URL, pick a custom slug.
- Publishes to a **public-facing microsite** at `/kit/:slug` that anyone can visit without logging in. The microsite is outside the main app shell — it's a standalone landing page the advocacy org can link to from their own channels.
- The microsite shows the curated bills, status badges, pre-written email templates, pre-written phone scripts, and one-tap contact actions targeting the NYC Council switchboard or (if the visitor enters their address) their specific council member.
- The kit owner sees an **analytics dashboard**: views, email-click conversions, call-click conversions, share events, referrer domains, trend charts, CSV export.

### 5.15 Pro Dashboard (paid)
- The logged-in paid user's home base.
- Shows: recent impact reports with status and download, watchlist summary, alert preferences summary, subscription status, quick-links to build a new action kit, upload a new platform, or add to watchlist.

### 5.16 Pricing / Upgrade page
- Three tiers: Free, Advocate ($9/mo or $89/yr), Enterprise ($29/mo or $249/yr).
- Monthly/yearly toggle.
- Feature comparison matrix.
- FAQ section.
- Clear upgrade CTA. (Stripe integration via Supabase — not a design concern, but the "manage subscription" affordance needs to exist.)

### 5.17 Auth / Account
- Sign up / sign in via Clerk.
- Subscription status visible to the logged-in user.
- Free users can still sign in, but most auth-gated capability lives behind paid tiers.

### 5.18 Global Search
- Always-available fuzzy search across members, bills, and hearings — the "command bar" of the product.
- Needs to be reachable from anywhere without taking the user off their current page.

### 5.19 AI Chat Assistant
- A floating, dismissible civic Q&A assistant.
- Answers general questions about NYC local government, how bills become laws, what a committee does, etc.
- Non-partisan, educational. Markdown responses.
- Available site-wide in the logged-in and anonymous experience.

### 5.20 Support / Donate page
- Public donation / support-the-project page (the free product is supported by paid tiers and donations).

## 6. Navigation scope

The product currently has these top-level destinations. The designer is free to reorganize, consolidate, or split this — but every concept needs a home:

**Core civic data (free):**
- Find My Member (address lookup / home)
- Council Members (directory)
- Member Profile (the hub)
- District Map
- Bills
- Hearings
- Transcript Search (free keyword, paid semantic)
- Money (finance comparison)

**Power tools (paid):**
- Influence Mapper
- Impact Analysis
- Watchlist
- Pro Dashboard
- Action Kits

**Meta:**
- Pricing / Upgrade
- Support the Project
- Auth (sign-in / account)
- Global search (ambient)
- AI chat (ambient)

**Standalone (no app shell):**
- Public Action Kit microsites at `/kit/:slug`

## 7. Data characteristics (things the design needs to accommodate)

- **51 council members.** The universe is small and fixed — every member can have a hand-crafted profile feel. Exploit this.
- **Thousands of bills per session**, many with dense legal titles and status histories. Needs scan-friendly list views and expandable detail.
- **Hundreds of hearings per year**, each with multiple agenda items and rich transcripts.
- **Campaign finance is inherently numeric and comparative** — charts, sortable tables, industry breakdowns.
- **All core data is served as static JSON** and refreshed nightly via a build pipeline. The design can assume data is fresh-as-of-last-night but not live.
- **Dynamic / user-generated data** (watchlists, reports, action kits, interactions) lives in Supabase, gated by auth.
- **Data provenance matters.** Every number traces to a specific government source (NYC Legislation API, NYC Open Data, NYC Campaign Finance Board, CityMeetings.nyc). The design should make it easy to show "where this came from" — trust is a product feature.

## 8. AI capabilities woven throughout

The product leans on Gemini in several places, and the design should make it obvious which content is AI-assisted (for trust) without making AI feel like a gimmick:

1. Plain-English bill explainers (on-demand per bill)
2. Hearing summaries (on-demand for upcoming, pre-built for past)
3. Semantic bill search (expand user query into related keywords)
4. Semantic transcript search across hearings
5. Impact Analysis (classify every bill against a user's policy platform)
6. Hearing sentiment scoring
7. Global civic Q&A chat assistant
8. Hearing key-quote extraction from transcripts

## 9. Product tone and values

These should come through in the design, not just the copy:

- **Trustworthy and non-partisan.** This is a civic utility, not an advocacy site. No editorializing. No red/blue team framing. Facts and sources.
- **Welcoming to people who've never paid attention to local government.** Not intimidating. Not jargon-heavy. Not academic.
- **But credible to professionals.** Journalists, advocacy researchers, and policy people need to trust it enough to cite it.
- **Accountability-oriented.** The whole product's thesis is "sunlight on power." Money, influence, timing, contradictions — the design should let those things surface, not bury them.
- **Empowering, not doom-y.** The goal is to make people feel like they *can* do something, not that the system is rigged beyond repair. Every informational view should feel like it has a plausible next action.

## 10. What we want you to reimagine

The current app exists and is live. We intentionally have **not** linked it in this brief because we want your direction to come from the problem, not the artifact. In particular, we'd like you to question these assumptions on first-principles grounds before you decide whether to keep them:

1. **Is a sidebar with 12 nav items the right shape for this?** The free user and the paid pro have radically different navigation needs. Should they see the same shell?
2. **The Member Profile is the single most visited page.** What would the *best possible* version of that page look like if you designed it like a Wikipedia-meets-LinkedIn-meets-Bloomberg-terminal hybrid?
3. **Bills are the core content object.** What does the ideal bill card / bill detail page look like when residents, advocates, and journalists all need different depths from the same piece of data?
4. **How does a resident who has never heard of their council member become an engaged advocate?** Is there a path through the product that makes that transition feel natural?
5. **The Action Kit microsite is a public, embeddable, brandable surface.** It's effectively a separate product aimed at an advocacy org's audience, not at Council Watch's users. How should it look and feel different from the main app while still feeling connected?
6. **Campaign finance and influence data is visual by nature.** What's the most legible, least-overwhelming way to show "this donor gave this much to this member within this window of them voting on this bill" — the core conflict-alert unit?
7. **AI-assisted content needs to feel trustworthy.** How do we visually distinguish AI-generated explainers and summaries from source data in a way that builds trust instead of undermining it?
8. **Mobile vs desktop.** Residents are mostly mobile. Advocates and professionals are mostly desktop. What's the right strategy — one responsive design, two distinct surfaces, or a mobile-first core with desktop-only power tools?

## 11. Deliverables we're looking for

In rough priority order:

1. **Design direction / mood.** What does this product *feel* like? Typography, color, imagery, density, voice. One to three directions is fine; we'll pick one.
2. **Information architecture proposal.** How should the capabilities in section 5 be grouped and navigated? A sitemap or IA diagram is ideal.
3. **Key screen concepts** (rough priority):
   - Find-My-Member landing / home
   - Member Profile (the hub)
   - Bill detail with civic action flow
   - Influence Mapper / conflict alert visual
   - Impact Analysis upload → results → report flow
   - Action Kit builder + public microsite
   - Pro Dashboard
   - Mobile counterparts for the top three
4. **Component system sketch.** The product has ~30 recurring UI primitives (bill cards, hearing cards, member cards, conflict alert cards, scorecards, sortable tables, filter bars, AI-content blocks, action CTAs, watch toggles, Pro-gates). A consistent system for these matters more than any individual hero screen.
5. **A "trust layer" pattern.** A reusable way of showing data provenance, AI-authorship, and confidence levels across the product.

## 12. Constraints and non-negotiables

- **Must remain free at the core.** Members, bills, hearings, campaign finance, district map, and global search are permanently free. Paid features layer on top — they cannot be the only way in.
- **Must be accessible.** WCAG AA at minimum. This is a civic utility. If someone can't use it because of color contrast, screen-reader support, or keyboard nav, we've failed.
- **Must feel trustworthy and non-partisan.** No colors or iconography that code politically. No aesthetic choices that feel "activist" in a way that would alienate a skeptical journalist or a moderate resident.
- **Tech stack is React 19 + Tailwind CSS v4 + Motion (Framer) + Recharts + Leaflet + Lucide icons.** The designer doesn't need to love this stack, but the resulting design should be buildable on it without requiring a custom illustration system or bespoke WebGL.
- **Static-first, fast.** The core app ships as static JSON + a client bundle. Designs that assume heavy real-time infra or constant server round-trips will need a serious justification.

## 13. Open questions for you to come back to us on

- How opinionated should the default "home" experience be? Should we push every first-time visitor through address lookup, or let them browse?
- Should the Pro dashboard and the free experience share a shell, or does the Pro user deserve their own distinct workspace?
- Is there an argument for unifying Bills, Hearings, and Transcript Search into a single "legislation" surface rather than three separate pages?
- Is the Action Kit microsite's visual language ours, or the advocacy org's? (It's brandable today, but we want your take on how far that should go.)
- What would a genuinely great "empty state" look like for a free user who hasn't signed in yet?

## 14. Not in scope for this engagement

- Back-end architecture, data pipeline, or database design.
- Content strategy for AI-generated explainers (we have a prompt library).
- Marketing site / blog.
- Mobile native apps — this is a responsive web product.

---

**Summary:** Council Watch NYC is a civic transparency utility with a free resident layer, a paid advocate layer, and a professional tier with heavy analytical tools and publishing capability. Its core promise is to make NYC City Council legible to anyone, and its secret weapon is letting advocates and journalists turn that legibility into action. We want a design direction that honors the free promise, earns professional trust, and makes every one of the jobs-to-be-done in section 4 feel obvious.

Come back to us with questions. The more you push back on what's in section 10, the better.
