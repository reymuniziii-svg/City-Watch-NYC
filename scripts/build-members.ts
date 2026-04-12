import { promises as fs } from "node:fs";
import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR, RAW_UPSTREAM_DIR, SESSION_END_YEAR, SESSION_START_YEAR, CONTENT_DIR } from "./lib/constants";
import { ensureDir, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import {
  extractVoteRecords,
  isSeatedCouncilMember,
  parseCommitteeAssignments,
  parseIntroFile,
  type RawEvent,
  type RawPerson,
} from "./lib/legislation";
import { isEnactedStatus } from "../src/lib/status-timeline";
import { normalizePersonName } from "./lib/normalize";
import type { BillRecord, HearingSummary, HearingRecord, MemberFinanceProfile, MemberLobbyingProfile, MemberProfile, MemberSummary, VoteRecord, WorkHorseScore } from "../src/lib/types";

interface SupplementalRow {
  slug: string | null;
  districtNumber: number;
  displayName: string;
  party: string;
  neighborhoods: string[];
  photoUrl: string;
  email: string;
  socials: {
    x?: string;
    instagram?: string;
    facebook?: string;
  };
  phone?: string;
}

interface MemberMetric {
  slug: string;
  billsSponsored: number;
  billsEnacted: number;
  coSponsorshipRate: number;
  hearingActivity: number;
  rankSponsored: number;
  rankEnacted: number;
}

interface WorkHorseRow {
  slug: string;
  successRate: number;
  committeePullRate: number;
  bipartisanReachRate: number;
  velocityScore: number;
  compositeScore: number;
  rank: number;
  billBreakdown: {
    introduced: number;
    passedCommittee: number;
    enacted: number;
    bipartisanBills: number;
  };
}

function loadSessionRange() {
  return {
    start: `${SESSION_START_YEAR}-01-01T00:00:00Z`,
    end: `${SESSION_END_YEAR}-12-31T23:59:59Z`,
  };
}

async function loadBillDetails(): Promise<BillRecord[]> {
  const root = path.join(PROCESSED_DIR, "bills");
  let years: string[] = [];
  try {
    years = await fs.readdir(root);
  } catch {
    return [];
  }

  const results: BillRecord[] = [];
  for (const year of years) {
    const yearDir = path.join(root, year);
    const stats = await fs.stat(yearDir);
    if (!stats.isDirectory()) {
      continue;
    }

    const files = (await fs.readdir(yearDir)).filter((name) => name.endsWith(".json"));
    for (const file of files) {
      const bill = await readJsonFile<BillRecord>(path.join(yearDir, file));
      results.push(bill);
    }
  }

  return results;
}

function fallbackScorecard() {
  return {
    billsSponsored: 0,
    billsSponsoredRank: 51,
    billsEnacted: 0,
    billsEnactedRank: 51,
    coSponsorshipRate: 0,
    hearingActivity: 0,
  };
}

function filterHearingSummariesForMember(
  hearingSummaries: HearingSummary[],
  committeeNames: Set<string>,
  fullName: string,
): HearingSummary[] {
  const normalizedMember = normalizePersonName(fullName);
  const memberLastName = normalizedMember.split(" ").at(-1) ?? normalizedMember;
  const normalizedCommittees = new Set(
    Array.from(committeeNames).map((name) =>
      normalizePersonName(
        name
          .replace(/\bcommittee on\b/gi, "")
          .replace(/\bsubcommittee on\b/gi, "")
          .replace(/&/g, " ")
          .replace(/\band\b/gi, " "),
      ),
    ),
  );

  return hearingSummaries
    .filter((summary) => {
      const normalizedBody = normalizePersonName(
        summary.bodyName
          .replace(/\bcommittee on\b/gi, "")
          .replace(/\bsubcommittee on\b/gi, "")
          .replace(/&/g, " ")
          .replace(/\band\b/gi, " "),
      );
      const quoteMatch = summary.quotes.some((quote) => {
        const haystack = normalizePersonName(`${quote.speaker} ${quote.chapterTitle} ${quote.quote}`);
        return haystack.includes(normalizedMember) || haystack.includes(memberLastName);
      });

      return normalizedCommittees.has(normalizedBody) || normalizedBody === "stated meeting" || quoteMatch;
    })
    .map((summary) => {
      const quotesForMember = summary.quotes.filter((quote) => {
        const haystack = normalizePersonName(`${quote.speaker} ${quote.chapterTitle} ${quote.quote}`);
        return haystack.includes(normalizedMember) || haystack.includes(memberLastName);
      });

      return {
        ...summary,
        quotes: (quotesForMember.length > 0 ? quotesForMember : summary.quotes).slice(0, 3),
      };
    })
    .slice(0, 6);
}

function statusOutcome(statusName: string): "Passed" | "Failed" | "Unknown" {
  if (/Enacted|Approved|Adopted|Passed/i.test(statusName)) {
    return "Passed";
  }

  if (/Failed|Filed|Veto/i.test(statusName)) {
    return "Failed";
  }

  return "Unknown";
}

async function buildVotesMap(bills: BillRecord[]): Promise<Map<string, VoteRecord[]>> {
  const voteMap = new Map<string, VoteRecord[]>();
  const billById = new Map(bills.map((bill) => [bill.billId, bill]));

  for (let year = SESSION_START_YEAR; year <= SESSION_END_YEAR; year += 1) {
    const eventsDir = path.join(RAW_UPSTREAM_DIR, "events", String(year));
    let files: string[] = [];

    try {
      files = (await fs.readdir(eventsDir)).filter((name) => name.endsWith(".json"));
    } catch {
      continue;
    }

    for (const file of files) {
      const event = await readJsonFile<RawEvent>(path.join(eventsDir, file));
      const votes = extractVoteRecords(event);

      for (const row of votes) {
        const parsed = parseIntroFile(row.matterFile);
        if (!parsed) {
          continue;
        }

        const bill = billById.get(parsed.billId);
        if (!bill) {
          continue;
        }

        const record: VoteRecord = {
          billId: bill.billId,
          introNumber: bill.introNumber,
          title: bill.title,
          vote: row.vote,
          outcome: statusOutcome(bill.statusName),
          date: row.date,
        };

        const existing = voteMap.get(row.memberSlug) ?? [];
        existing.push(record);
        voteMap.set(row.memberSlug, existing);
      }
    }
  }

  for (const [slug, rows] of voteMap.entries()) {
    rows.sort((a, b) => b.date.localeCompare(a.date));
    voteMap.set(slug, rows.slice(0, 20));
  }

  return voteMap;
}

export async function buildMembers(): Promise<MemberSummary[]> {
  const peopleDir = path.join(RAW_UPSTREAM_DIR, "people");
  const peopleFiles = (await fs.readdir(peopleDir)).filter((name) => name.endsWith(".json"));
  const people = await Promise.all(peopleFiles.map((file) => readJsonFile<RawPerson>(path.join(peopleDir, file))));

  const peopleBySlug = new Map(people.map((person) => [person.Slug, person]));
  const supplemental = await readJsonFile<SupplementalRow[]>(path.join(CONTENT_DIR, "member-supplemental.json"));
  let metrics: MemberMetric[] = [];
  try {
    metrics = await readJsonFile<MemberMetric[]>(path.join(PROCESSED_DIR, "member-metrics.json"));
  } catch {
    // ignore
  }
  const metricBySlug = new Map<string, MemberMetric>(metrics.map((row): [string, MemberMetric] => [row.slug, row]));

  let workhorseRows: WorkHorseRow[] = [];
  try {
    workhorseRows = await readJsonFile<WorkHorseRow[]>(path.join(PROCESSED_DIR, "workhorse-index.json"));
  } catch {
    // ignore -- workhorse data may not exist yet
  }
  const workhorseBySlug = new Map<string, WorkHorseRow>(workhorseRows.map((row): [string, WorkHorseRow] => [row.slug, row]));

  const bills = await loadBillDetails();
  const hearings = await readJsonFile<HearingRecord[]>(path.join(PROCESSED_DIR, "hearings-upcoming.json")).catch(() => []);
  const hearingSummaries = await readJsonFile<HearingSummary[]>(path.join(PROCESSED_DIR, "hearing-enrichment.json")).catch(() => []);
  const financeFiles = await fs.readdir(path.join(PROCESSED_DIR, "finance")).catch(() => []);
  const financeBySlug = new Map<string, MemberFinanceProfile>();
  for (const file of financeFiles.filter((name) => name.endsWith(".json"))) {
    const finance = await readJsonFile<MemberFinanceProfile>(path.join(PROCESSED_DIR, "finance", file));
    financeBySlug.set(finance.slug, finance);
  }

  const lobbyingDir = path.join(PUBLIC_DATA_DIR, "lobbying", "members");
  const lobbyingFiles = await fs.readdir(lobbyingDir).catch(() => []);
  const lobbyingBySlug = new Map<string, MemberLobbyingProfile>();
  for (const file of lobbyingFiles.filter((name) => name.endsWith(".json"))) {
    try {
      const lobbying = await readJsonFile<MemberLobbyingProfile>(path.join(lobbyingDir, file));
      lobbyingBySlug.set(lobbying.memberSlug, lobbying);
    } catch {
      // skip unreadable files
    }
  }
  const votesByMember = await buildVotesMap(bills);

  const { start, end } = loadSessionRange();
  const membersIndex: MemberSummary[] = [];

  for (const entry of supplemental) {
    const person = entry.slug ? peopleBySlug.get(entry.slug) : null;
    const seated = Boolean(entry.slug && person && isSeatedCouncilMember(person, start, end));

    const metric = entry.slug ? metricBySlug.get(entry.slug) : null;

    membersIndex.push({
      slug: seated ? entry.slug : null,
      fullName: seated ? person!.FullName : entry.displayName,
      districtNumber: entry.districtNumber,
      party: entry.party === "Blank" ? "Unknown" : entry.party,
      neighborhoods: entry.neighborhoods,
      billsSponsored: metric?.billsSponsored ?? 0,
      billsEnacted: metric?.billsEnacted ?? 0,
      rankSponsored: metric?.rankSponsored ?? 51,
      rankEnacted: metric?.rankEnacted ?? 51,
      status: seated ? "seated" : "vacant",
    });

    if (!seated || !entry.slug || !person) {
      continue;
    }

    const committees = parseCommitteeAssignments(person, start, end);
    const committeeNames = new Set(committees.map((committee) => committee.bodyName));
    const now = Date.now();
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

    const memberHearings = hearings
      .filter((hearing) => committeeNames.has(hearing.bodyName))
      .filter((hearing) => {
        const when = new Date(hearing.date).getTime();
        return when >= now && when <= now + twoWeeksMs;
      })
      .slice(0, 20);
    const memberHearingSummaries = filterHearingSummariesForMember(hearingSummaries, committeeNames, person.FullName);

    const memberBills = bills
      .filter((bill) => bill.sponsors.some((sponsor) => sponsor.slug === entry.slug))
      .sort((a, b) => (b.actionDate || b.introDate).localeCompare(a.actionDate || a.introDate));

    const enactedFallback = memberBills.filter((bill) => bill.leadSponsorSlug === entry.slug && isEnactedStatus(bill.statusName)).slice(0, 20);

    const profile: MemberProfile = {
      slug: entry.slug,
      fullName: person.FullName,
      districtNumber: entry.districtNumber,
      party: entry.party === "Blank" ? "Unknown" : entry.party,
      neighborhoods: entry.neighborhoods,
      photoUrl: entry.photoUrl,
      officialUrl: person.WWW ?? `https://council.nyc.gov/district-${entry.districtNumber}/`,
      contact: {
        email: person.Email || entry.email,
        website: person.WWW ?? `https://council.nyc.gov/district-${entry.districtNumber}/`,
        districtOffice: {
          address: person.DistrictOffice?.Address ?? "",
          city: person.DistrictOffice?.City ?? "",
          state: person.DistrictOffice?.State ?? "",
          zip: person.DistrictOffice?.Zip ?? "",
        },
        legislativeOffice: {
          address: person.LegislativeOffice?.Address ?? "",
          city: person.LegislativeOffice?.City ?? "",
          state: person.LegislativeOffice?.State ?? "",
          zip: person.LegislativeOffice?.Zip ?? "",
        },
        phone: entry.phone,
      },
      socials: entry.socials,
      committees,
      scorecard: metric
        ? {
            billsSponsored: metric.billsSponsored,
            billsSponsoredRank: metric.rankSponsored,
            billsEnacted: metric.billsEnacted,
            billsEnactedRank: metric.rankEnacted,
            coSponsorshipRate: metric.coSponsorshipRate,
            hearingActivity: metric.hearingActivity,
          }
        : fallbackScorecard(),
      bills: memberBills,
      upcomingHearings: memberHearings,
      hearingSummaries: memberHearingSummaries,
      recentVotes: votesByMember.get(entry.slug) ?? [],
      enactedFallback,
      finance: financeBySlug.get(entry.slug) ?? null,
      lobbying: lobbyingBySlug.get(entry.slug) ?? null,
      workHorse: workhorseBySlug.get(entry.slug) ?? null,
    };

    await ensureDir(path.join(PROCESSED_DIR, "members"));
    await writeJsonFile(path.join(PROCESSED_DIR, "members", `${entry.slug}.json`), profile);
    await ensureDir(path.join(PUBLIC_DATA_DIR, "members"));
    await writeJsonFile(path.join(PUBLIC_DATA_DIR, "members", `${entry.slug}.json`), profile);
  }

  membersIndex.sort((a, b) => a.districtNumber - b.districtNumber);

  await writeJsonFile(path.join(PROCESSED_DIR, "members-index.json"), membersIndex);
  await ensureDir(PUBLIC_DATA_DIR);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "members-index.json"), membersIndex);

  console.log(`[build-members] wrote index rows: ${membersIndex.length}`);
  return membersIndex;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildMembers().catch((error) => {
    console.error("[build-members] failed", error);
    process.exitCode = 1;
  });
}
