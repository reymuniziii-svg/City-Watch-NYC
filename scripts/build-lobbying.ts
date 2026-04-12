import path from "node:path";
import { CONTENT_DIR, LOBBYING_CACHE_FILE, LOBBYING_DATASET_ID, PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { ensureDir, fileExists, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { normalizePersonName, toSlug } from "./lib/normalize";
import { fetchSocrataAll } from "./lib/socrata";
import { classifyIndustry } from "./build-finance";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface LobbyingRow {
  lobbyist_name?: string;
  client_name?: string;
  client_industry?: string;
  lobbyist_activities?: string;
  lobbyist_targets?: string;
  periodic_activities?: string;
  periodic_targets?: string;
  compensation_total?: string;
  lobbying_expenses_total?: string;
  report_year?: string;
  period?: string;
  registration_id?: string;
  periodic_id?: string;
  lobbyist_id?: string;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}

interface SupplementalEntry {
  slug: string | null;
  districtNumber: number;
  displayName: string;
}

interface BillIndexEntry {
  billId: string;
  introNumber: string;
  title: string;
  committee: string;
  leadSponsorSlug: string | null;
}

interface LobbyingCacheFile {
  generatedAt: string;
  lastMaxReportYear: number;
  lastMaxPeriod: string;
  rowCount: number;
}

// Intermediate types for aggregation
interface ParsedActivity {
  text: string;
  matchedBillIntro: string | null;
  matchedBillTitle: string | null;
  position: "for" | "against" | "unknown";
}

interface ParsedTarget {
  text: string;
  matchedMemberSlug: string | null;
  matchedMemberName: string | null;
}

interface ClientGroup {
  clientName: string;
  clientId: string;
  clientIndustry: string;
  lobbyistName: string;
  lobbyistId: string;
  totalCompensation: number;
  totalExpenses: number;
  totalSpending: number;
  reportYear: number;
  period: string;
  endDate: string;
  activities: ParsedActivity[];
  targets: ParsedTarget[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function parseAmount(value: string | undefined): number {
  const numeric = Number.parseFloat((value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

function splitDelimited(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const INTRO_REGEX = /(Int|Res|LU)\s*\.?\s*(\d{1,4})\s*[-–]\s*(\d{4})/gi;
const SUPPORT_REGEX = /\b(support|favor|advocate|promote|urge passage|in favor)\b/i;
const OPPOSE_REGEX = /\b(oppose|against|opposition|object|urge defeat)\b/i;
const COUNCIL_CONTEXT_REGEX = /\b(council|member|cm|district)\b/i;

function detectPosition(text: string): "for" | "against" | "unknown" {
  if (SUPPORT_REGEX.test(text)) return "for";
  if (OPPOSE_REGEX.test(text)) return "against";
  return "unknown";
}

function extractIntroNumbers(text: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(INTRO_REGEX.source, INTRO_REGEX.flags);
  while ((match = regex.exec(text)) !== null) {
    const prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const num = match[2].padStart(4, "0");
    const year = match[3];
    matches.push(`${prefix} ${num}-${year}`);
  }
  return matches;
}

/* ------------------------------------------------------------------ */
/*  Build Lobbying                                                    */
/* ------------------------------------------------------------------ */

export async function buildLobbying(): Promise<void> {
  console.log("[build-lobbying] starting...");

  // 1. Fetch data from Socrata
  const rows = await fetchSocrataAll<LobbyingRow>({
    datasetId: LOBBYING_DATASET_ID,
    where: "report_year >= '2024'",
    order: "report_year DESC",
  });

  console.log(`[build-lobbying] fetched ${rows.length} rows from Socrata`);

  if (rows.length === 0) {
    console.log("[build-lobbying] no data returned, skipping");
    return;
  }

  // 2. Cache check
  const maxReportYear = Math.max(...rows.map((r) => Number.parseInt(r.report_year ?? "0", 10)));
  const maxPeriod = rows.find((r) => Number.parseInt(r.report_year ?? "0", 10) === maxReportYear)?.period ?? "";

  if (await fileExists(LOBBYING_CACHE_FILE)) {
    try {
      const cache = await readJsonFile<LobbyingCacheFile>(LOBBYING_CACHE_FILE);
      if (cache.lastMaxReportYear === maxReportYear && cache.lastMaxPeriod === maxPeriod && cache.rowCount === rows.length) {
        console.log("[build-lobbying] data unchanged, skipping rebuild");
        return;
      }
    } catch {
      // cache unreadable, proceed with rebuild
    }
  }

  // 3. Load dependencies
  const supplemental = await readJsonFile<SupplementalEntry[]>(path.join(CONTENT_DIR, "member-supplemental.json"));

  let billsIndex: BillIndexEntry[] = [];
  const billsPath = path.join(PUBLIC_DATA_DIR, "bills-index.json");
  if (await fileExists(billsPath)) {
    billsIndex = await readJsonFile<BillIndexEntry[]>(billsPath);
  } else {
    console.warn("[build-lobbying] bills-index.json not found, bill matching will be skipped");
  }

  // 4. Build lookups
  const memberByNormalized = new Map<string, { slug: string; displayName: string }>();
  const memberByLastName = new Map<string, { slug: string; displayName: string }[]>();
  for (const m of supplemental) {
    if (!m.slug) continue;
    const norm = normalizePersonName(m.displayName);
    memberByNormalized.set(norm, { slug: m.slug, displayName: m.displayName });

    const lastName = norm.split(" ").pop() ?? "";
    if (lastName) {
      const list = memberByLastName.get(lastName) ?? [];
      list.push({ slug: m.slug, displayName: m.displayName });
      memberByLastName.set(lastName, list);
    }
  }

  const billByIntro = new Map<string, BillIndexEntry>();
  for (const bill of billsIndex) {
    billByIntro.set(bill.introNumber, bill);
    // Also index by normalized form
    const norm = bill.introNumber.replace(/\s+/g, " ").trim();
    billByIntro.set(norm, bill);
  }

  // 5. Parse, resolve entities, and group
  const groups: ClientGroup[] = [];

  for (const row of rows) {
    const clientName = (row.client_name ?? "").trim();
    const lobbyistName = (row.lobbyist_name ?? "").trim();
    if (!clientName || !lobbyistName) continue;

    const rawIndustry = (row.client_industry ?? "").trim();
    const clientIndustry = classifyIndustry(rawIndustry, clientName) !== "Other / Mixed"
      ? classifyIndustry(rawIndustry, clientName)
      : rawIndustry || "Other / Mixed";

    // Parse activities
    const activityTexts = [
      ...splitDelimited(row.lobbyist_activities),
      ...splitDelimited(row.periodic_activities),
    ];
    const activities: ParsedActivity[] = [];
    for (const text of activityTexts) {
      const intros = extractIntroNumbers(text);
      const position = detectPosition(text);
      if (intros.length > 0) {
        for (const intro of intros) {
          const bill = billByIntro.get(intro);
          activities.push({
            text,
            matchedBillIntro: bill?.introNumber ?? intro,
            matchedBillTitle: bill?.title ?? null,
            position,
          });
        }
      } else {
        activities.push({ text, matchedBillIntro: null, matchedBillTitle: null, position });
      }
    }

    // Parse targets
    const targetTexts = [
      ...splitDelimited(row.lobbyist_targets),
      ...splitDelimited(row.periodic_targets),
    ];
    const targets: ParsedTarget[] = [];
    for (const text of targetTexts) {
      const norm = normalizePersonName(text);
      let matched = false;

      // Full-name match
      for (const [memberNorm, member] of memberByNormalized) {
        if (norm.includes(memberNorm)) {
          targets.push({ text, matchedMemberSlug: member.slug, matchedMemberName: member.displayName });
          matched = true;
          break;
        }
      }

      // Last-name fallback with context keyword
      if (!matched && COUNCIL_CONTEXT_REGEX.test(text)) {
        const normTokens = norm.split(" ");
        for (const token of normTokens) {
          const candidates = memberByLastName.get(token);
          if (candidates && candidates.length === 1) {
            targets.push({ text, matchedMemberSlug: candidates[0].slug, matchedMemberName: candidates[0].displayName });
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        const isCouncilWide = /\b(city council|nyc council|new york city council)\b/i.test(text);
        targets.push({
          text,
          matchedMemberSlug: isCouncilWide ? "council-wide" : null,
          matchedMemberName: isCouncilWide ? "NYC Council (body)" : null,
        });
      }
    }

    groups.push({
      clientName,
      clientId: (row.client_id ?? "").trim(),
      clientIndustry,
      lobbyistName,
      lobbyistId: (row.lobbyist_id ?? "").trim(),
      totalCompensation: parseAmount(row.compensation_total),
      totalExpenses: parseAmount(row.lobbying_expenses_total),
      totalSpending: parseAmount(row.compensation_total) + parseAmount(row.lobbying_expenses_total),
      reportYear: Number.parseInt(row.report_year ?? "0", 10),
      period: (row.period ?? "").trim(),
      endDate: (row.end_date ?? "").trim(),
      activities,
      targets,
    });
  }

  console.log(`[build-lobbying] parsed ${groups.length} client-lobbyist groups`);

  // 6. Aggregate per-bill profiles
  const billProfiles = new Map<string, {
    introNumber: string;
    billTitle: string;
    clients: Map<string, { clientName: string; clientIndustry: string; lobbyists: Set<string>; totalSpending: number; positions: Set<string>; activities: Set<string>; reportCount: number; latestDate: string; }>;
  }>();

  for (const group of groups) {
    for (const act of group.activities) {
      if (!act.matchedBillIntro) continue;
      const intro = act.matchedBillIntro;

      if (!billProfiles.has(intro)) {
        billProfiles.set(intro, {
          introNumber: intro,
          billTitle: act.matchedBillTitle ?? "",
          clients: new Map(),
        });
      }

      const profile = billProfiles.get(intro)!;
      const key = group.clientName;
      const existing = profile.clients.get(key);
      if (existing) {
        existing.totalSpending += group.totalSpending;
        existing.lobbyists.add(group.lobbyistName);
        existing.positions.add(act.position);
        existing.activities.add(act.text);
        existing.reportCount += 1;
        if (group.endDate > existing.latestDate) existing.latestDate = group.endDate;
      } else {
        profile.clients.set(key, {
          clientName: group.clientName,
          clientIndustry: group.clientIndustry,
          lobbyists: new Set([group.lobbyistName]),
          totalSpending: group.totalSpending,
          positions: new Set([act.position]),
          activities: new Set([act.text]),
          reportCount: 1,
          latestDate: group.endDate,
        });
      }
    }
  }

  // 7. Aggregate per-member profiles
  const memberProfiles = new Map<string, {
    slug: string;
    memberName: string;
    clients: Map<string, {
      clientName: string; clientIndustry: string; lobbyists: Set<string>;
      totalSpending: number; subjects: Set<string>; reportCount: number;
      relatedBills: Map<string, { introNumber: string; title: string; position: string }>;
    }>;
    recentFilings: { lobbyistName: string; clientName: string; period: string; reportYear: number; compensationTotal: number; endDate: string }[];
  }>();

  for (const group of groups) {
    for (const target of group.targets) {
      if (!target.matchedMemberSlug || target.matchedMemberSlug === "council-wide") continue;
      const slug = target.matchedMemberSlug;

      if (!memberProfiles.has(slug)) {
        memberProfiles.set(slug, {
          slug,
          memberName: target.matchedMemberName ?? "",
          clients: new Map(),
          recentFilings: [],
        });
      }

      const profile = memberProfiles.get(slug)!;
      const key = group.clientName;
      const existing = profile.clients.get(key);

      // Collect related bills from this group's activities
      const bills = new Map<string, { introNumber: string; title: string; position: string }>();
      for (const act of group.activities) {
        if (act.matchedBillIntro) {
          bills.set(act.matchedBillIntro, {
            introNumber: act.matchedBillIntro,
            title: act.matchedBillTitle ?? "",
            position: act.position,
          });
        }
      }

      if (existing) {
        existing.totalSpending += group.totalSpending;
        existing.lobbyists.add(group.lobbyistName);
        existing.reportCount += 1;
        for (const act of group.activities) {
          existing.subjects.add(act.text);
        }
        for (const [intro, bill] of bills) {
          existing.relatedBills.set(intro, bill);
        }
      } else {
        profile.clients.set(key, {
          clientName: group.clientName,
          clientIndustry: group.clientIndustry,
          lobbyists: new Set([group.lobbyistName]),
          totalSpending: group.totalSpending,
          subjects: new Set(group.activities.map((a) => a.text)),
          reportCount: 1,
          relatedBills: bills,
        });
      }

      profile.recentFilings.push({
        lobbyistName: group.lobbyistName,
        clientName: group.clientName,
        period: group.period,
        reportYear: group.reportYear,
        compensationTotal: group.totalCompensation,
        endDate: group.endDate,
      });
    }
  }

  // 8. Write output files
  const now = new Date().toISOString();

  await ensureDir(path.join(PUBLIC_DATA_DIR, "lobbying"));
  await ensureDir(path.join(PUBLIC_DATA_DIR, "lobbying", "bills"));
  await ensureDir(path.join(PUBLIC_DATA_DIR, "lobbying", "members"));

  // Write per-bill profiles
  let billFileCount = 0;
  for (const [intro, profile] of billProfiles) {
    const clients = Array.from(profile.clients.values())
      .map((c) => ({
        clientName: c.clientName,
        clientIndustry: c.clientIndustry,
        lobbyistName: Array.from(c.lobbyists)[0] ?? "",
        position: (c.positions.has("for") ? "for" : c.positions.has("against") ? "against" : "unknown") as "for" | "against" | "unknown",
        totalSpending: c.totalSpending,
        reportCount: c.reportCount,
        latestReportDate: c.latestDate,
      }))
      .sort((a, b) => b.totalSpending - a.totalSpending);

    // Industry breakdown
    const industryMap = new Map<string, { totalSpending: number; clientCount: number; forCount: number; againstCount: number; unknownCount: number }>();
    for (const c of clients) {
      const existing = industryMap.get(c.clientIndustry);
      if (existing) {
        existing.totalSpending += c.totalSpending;
        existing.clientCount += 1;
        if (c.position === "for") existing.forCount += 1;
        else if (c.position === "against") existing.againstCount += 1;
        else existing.unknownCount += 1;
      } else {
        industryMap.set(c.clientIndustry, {
          totalSpending: c.totalSpending,
          clientCount: 1,
          forCount: c.position === "for" ? 1 : 0,
          againstCount: c.position === "against" ? 1 : 0,
          unknownCount: c.position === "unknown" ? 1 : 0,
        });
      }
    }

    // Firms breakdown
    const firmMap = new Map<string, { clientCount: number; totalSpending: number }>();
    for (const c of Array.from(profile.clients.values())) {
      for (const firm of c.lobbyists) {
        const existing = firmMap.get(firm);
        if (existing) {
          existing.clientCount += 1;
          existing.totalSpending += c.totalSpending;
        } else {
          firmMap.set(firm, { clientCount: 1, totalSpending: c.totalSpending });
        }
      }
    }

    const billProfile = {
      introNumber: intro,
      billTitle: profile.billTitle,
      updatedAt: now,
      totalLobbyingSpending: clients.reduce((sum, c) => sum + c.totalSpending, 0),
      clientCount: clients.length,
      firmCount: firmMap.size,
      topClients: clients.slice(0, 10),
      industryBreakdown: Array.from(industryMap.entries())
        .map(([industry, data]) => ({
          industry,
          totalSpending: data.totalSpending,
          clientCount: data.clientCount,
          positions: { for: data.forCount, against: data.againstCount, unknown: data.unknownCount },
        }))
        .sort((a, b) => b.totalSpending - a.totalSpending),
      topFirms: Array.from(firmMap.entries())
        .map(([lobbyistName, data]) => ({ lobbyistName, clientCount: data.clientCount, totalSpending: data.totalSpending }))
        .sort((a, b) => b.totalSpending - a.totalSpending)
        .slice(0, 10),
    };

    const filename = toSlug(intro) + ".json";
    await writeJsonFile(path.join(PUBLIC_DATA_DIR, "lobbying", "bills", filename), billProfile);
    billFileCount += 1;
  }

  // Write per-member profiles
  let memberFileCount = 0;
  for (const [slug, profile] of memberProfiles) {
    const clients = Array.from(profile.clients.values())
      .map((c) => ({
        clientName: c.clientName,
        clientIndustry: c.clientIndustry,
        lobbyistName: Array.from(c.lobbyists)[0] ?? "",
        totalSpending: c.totalSpending,
        reportCount: c.reportCount,
        subjects: Array.from(c.subjects).slice(0, 5),
        relatedBills: Array.from(c.relatedBills.values()).map((b) => ({
          introNumber: b.introNumber,
          title: b.title,
          position: b.position as "for" | "against" | "unknown",
        })),
      }))
      .sort((a, b) => b.totalSpending - a.totalSpending);

    // Industry breakdown
    const industryMap = new Map<string, { totalSpending: number; clientCount: number }>();
    for (const c of clients) {
      const existing = industryMap.get(c.clientIndustry);
      if (existing) {
        existing.totalSpending += c.totalSpending;
        existing.clientCount += 1;
      } else {
        industryMap.set(c.clientIndustry, { totalSpending: c.totalSpending, clientCount: 1 });
      }
    }

    const memberProfile = {
      memberSlug: slug,
      memberName: profile.memberName,
      updatedAt: now,
      totalLobbyingSpending: clients.reduce((sum, c) => sum + c.totalSpending, 0),
      uniqueClients: clients.length,
      uniqueFirms: new Set(clients.map((c) => c.lobbyistName)).size,
      topClients: clients.slice(0, 15),
      topIndustries: Array.from(industryMap.entries())
        .map(([industry, data]) => ({ industry, totalSpending: data.totalSpending, clientCount: data.clientCount }))
        .sort((a, b) => b.totalSpending - a.totalSpending),
      recentFilings: profile.recentFilings
        .sort((a, b) => (b.endDate > a.endDate ? 1 : -1))
        .slice(0, 20),
    };

    await writeJsonFile(path.join(PUBLIC_DATA_DIR, "lobbying", "members", `${slug}.json`), memberProfile);
    memberFileCount += 1;
  }

  // Write cache
  await ensureDir(PROCESSED_DIR);
  await writeJsonFile(LOBBYING_CACHE_FILE, {
    generatedAt: now,
    lastMaxReportYear: maxReportYear,
    lastMaxPeriod: maxPeriod,
    rowCount: rows.length,
  });

  // Stats
  const resolvedMembers = groups.filter((g) => g.targets.some((t) => t.matchedMemberSlug && t.matchedMemberSlug !== "council-wide")).length;
  const resolvedBills = groups.filter((g) => g.activities.some((a) => a.matchedBillIntro)).length;
  console.log(`[build-lobbying] resolved ${resolvedMembers}/${groups.length} groups to members (${Math.round((resolvedMembers / Math.max(groups.length, 1)) * 100)}%)`);
  console.log(`[build-lobbying] resolved ${resolvedBills}/${groups.length} groups to bills (${Math.round((resolvedBills / Math.max(groups.length, 1)) * 100)}%)`);
  console.log(`[build-lobbying] wrote ${billFileCount} bill profiles, ${memberFileCount} member profiles`);
}

/* ------------------------------------------------------------------ */
/*  Build Lobbying Index                                              */
/* ------------------------------------------------------------------ */

export async function buildLobbyingIndex(): Promise<void> {
  console.log("[build-lobbying-index] starting...");

  const lobbyingDir = path.join(PUBLIC_DATA_DIR, "lobbying", "members");
  if (!(await fileExists(lobbyingDir))) {
    console.log("[build-lobbying-index] no lobbying/members directory, skipping");
    return;
  }

  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(lobbyingDir)).filter((f) => f.endsWith(".json"));

  // Aggregate across all member profiles to build client-level index
  const clientIndex = new Map<string, {
    clientName: string;
    clientIndustry: string;
    totalSpending: number;
    lobbyistNames: Set<string>;
    targetedMembers: Set<string>;
    targetedBills: Set<string>;
    latestReportYear: number;
    latestPeriod: string;
  }>();

  for (const file of files) {
    try {
      const profile = await readJsonFile<{
        topClients: { clientName: string; clientIndustry: string; lobbyistName: string; totalSpending: number; relatedBills: { introNumber: string }[] }[];
        recentFilings: { reportYear: number; period: string }[];
      }>(path.join(lobbyingDir, file));

      const memberSlug = file.replace(".json", "");

      for (const client of profile.topClients) {
        const key = client.clientName;
        const existing = clientIndex.get(key);
        if (existing) {
          existing.totalSpending += client.totalSpending;
          existing.lobbyistNames.add(client.lobbyistName);
          existing.targetedMembers.add(memberSlug);
          for (const bill of client.relatedBills) {
            existing.targetedBills.add(bill.introNumber);
          }
        } else {
          clientIndex.set(key, {
            clientName: client.clientName,
            clientIndustry: client.clientIndustry,
            totalSpending: client.totalSpending,
            lobbyistNames: new Set([client.lobbyistName]),
            targetedMembers: new Set([memberSlug]),
            targetedBills: new Set(client.relatedBills.map((b) => b.introNumber)),
            latestReportYear: 0,
            latestPeriod: "",
          });
        }
      }

      // Update latest filing info
      for (const filing of profile.recentFilings) {
        for (const [, entry] of clientIndex) {
          if (filing.reportYear > entry.latestReportYear) {
            entry.latestReportYear = filing.reportYear;
            entry.latestPeriod = filing.period;
          }
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  const index = Array.from(clientIndex.values())
    .map((entry) => ({
      clientName: entry.clientName,
      clientIndustry: entry.clientIndustry,
      totalSpending: entry.totalSpending,
      lobbyistNames: Array.from(entry.lobbyistNames),
      targetedMemberCount: entry.targetedMembers.size,
      targetedBillCount: entry.targetedBills.size,
      latestReportYear: entry.latestReportYear,
      latestPeriod: entry.latestPeriod,
    }))
    .sort((a, b) => b.totalSpending - a.totalSpending);

  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "lobbying-index.json"), index);
  console.log(`[build-lobbying-index] wrote ${index.length} entries to lobbying-index.json`);
}

/* ------------------------------------------------------------------ */
/*  CLI entry                                                         */
/* ------------------------------------------------------------------ */

if (import.meta.url === `file://${process.argv[1]}`) {
  buildLobbying()
    .then(() => buildLobbyingIndex())
    .catch((error) => {
      console.error("[build-lobbying] failed", error);
      process.exitCode = 1;
    });
}
