import { promises as fs } from "node:fs";
import path from "node:path";
import { CONTENT_DIR, PROCESSED_DIR, RAW_UPSTREAM_DIR, SESSION_END_YEAR, SESSION_START_YEAR } from "./lib/constants";
import { readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { isEnactedStatus, normalizeDate } from "../src/lib/status-timeline";
import { parseCommitteeAssignments, type RawEvent, type RawPerson } from "./lib/legislation";

interface BillLite {
  leadSponsorSlug: string | null;
  statusName: string;
  sponsors: Array<{ slug: string }>;
}

interface MetricRow {
  slug: string;
  billsSponsored: number;
  billsEnacted: number;
  coSponsorshipRate: number;
  hearingActivity: number;
  rankSponsored: number;
  rankEnacted: number;
}

function sessionRangeIso() {
  return {
    start: `${SESSION_START_YEAR}-01-01T00:00:00Z`,
    end: `${SESSION_END_YEAR}-12-31T23:59:59Z`,
  };
}

async function listBillFiles(): Promise<string[]> {
  const billsRoot = path.join(PROCESSED_DIR, "bills");
  let years: string[] = [];

  try {
    years = await fs.readdir(billsRoot);
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const year of years) {
    const yearDir = path.join(billsRoot, year);
    const stats = await fs.stat(yearDir);
    if (!stats.isDirectory()) {
      continue;
    }

    const yearFiles = (await fs.readdir(yearDir)).filter((name) => name.endsWith(".json"));
    for (const name of yearFiles) {
      files.push(path.join(yearDir, name));
    }
  }

  return files;
}

function rank(rows: MetricRow[], metric: "billsSponsored" | "billsEnacted", key: "rankSponsored" | "rankEnacted") {
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric] || a.slug.localeCompare(b.slug));
  sorted.forEach((row, index) => {
    const target = rows.find((entry) => entry.slug === row.slug);
    if (target) {
      target[key] = index + 1;
    }
  });
}

async function loadCouncilSlugs(): Promise<Set<string>> {
  try {
    const rows = await readJsonFile<Array<{ slug: string | null }>>(path.join(CONTENT_DIR, "member-supplemental.json"));
    return new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)));
  } catch {
    return new Set();
  }
}

async function loadChairCommittees(councilSlugs: Set<string>): Promise<Map<string, Set<string>>> {
  const directory = path.join(RAW_UPSTREAM_DIR, "people");
  const files = (await fs.readdir(directory)).filter((name) => name.endsWith(".json"));
  const { start, end } = sessionRangeIso();

  const map = new Map<string, Set<string>>();

  for (const file of files) {
    const person = await readJsonFile<RawPerson>(path.join(directory, file));
    if (councilSlugs.size > 0 && !councilSlugs.has(person.Slug)) {
      continue;
    }

    const committees = parseCommitteeAssignments(person, start, end).filter((entry) => entry.isChair);
    if (committees.length === 0) {
      continue;
    }

    map.set(
      person.Slug,
      new Set(committees.map((entry) => entry.bodyName)),
    );
  }

  return map;
}

async function computeHearingActivity(chairCommittees: Map<string, Set<string>>): Promise<Map<string, number>> {
  const output = new Map<string, number>();
  const now = new Date();

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
      const eventDate = new Date(normalizeDate(event.Date));
      if (Number.isNaN(eventDate.getTime()) || eventDate > now) {
        continue;
      }

      for (const [slug, committees] of chairCommittees.entries()) {
        if (committees.has(event.BodyName)) {
          output.set(slug, (output.get(slug) ?? 0) + 1);
        }
      }
    }
  }

  return output;
}

export async function buildMetrics(): Promise<Map<string, MetricRow>> {
  const files = await listBillFiles();
  const councilSlugs = await loadCouncilSlugs();

  const accumulator = new Map<
    string,
    {
      billsSponsored: number;
      billsEnacted: number;
      totalSponsoredAppearances: number;
      nonLeadSponsoredAppearances: number;
    }
  >();

  for (const file of files) {
    const bill = await readJsonFile<BillLite>(file);

    if (bill.leadSponsorSlug && (councilSlugs.size === 0 || councilSlugs.has(bill.leadSponsorSlug))) {
      const current = accumulator.get(bill.leadSponsorSlug) ?? {
        billsSponsored: 0,
        billsEnacted: 0,
        totalSponsoredAppearances: 0,
        nonLeadSponsoredAppearances: 0,
      };
      current.billsSponsored += 1;
      if (isEnactedStatus(bill.statusName)) {
        current.billsEnacted += 1;
      }
      accumulator.set(bill.leadSponsorSlug, current);
    }

    for (const sponsor of bill.sponsors) {
      if (!sponsor.slug) {
        continue;
      }

      if (councilSlugs.size > 0 && !councilSlugs.has(sponsor.slug)) {
        continue;
      }

      const current = accumulator.get(sponsor.slug) ?? {
        billsSponsored: 0,
        billsEnacted: 0,
        totalSponsoredAppearances: 0,
        nonLeadSponsoredAppearances: 0,
      };
      current.totalSponsoredAppearances += 1;

      if (bill.leadSponsorSlug && sponsor.slug !== bill.leadSponsorSlug) {
        current.nonLeadSponsoredAppearances += 1;
      }

      accumulator.set(sponsor.slug, current);
    }
  }

  const chairCommittees = await loadChairCommittees(councilSlugs);
  const hearingActivity = await computeHearingActivity(chairCommittees);

  const rows: MetricRow[] = Array.from(accumulator.entries()).map(([slug, value]) => ({
    slug,
    billsSponsored: value.billsSponsored,
    billsEnacted: value.billsEnacted,
    coSponsorshipRate:
      value.totalSponsoredAppearances > 0
        ? Number((value.nonLeadSponsoredAppearances / value.totalSponsoredAppearances).toFixed(3))
        : 0,
    hearingActivity: hearingActivity.get(slug) ?? 0,
    rankSponsored: 0,
    rankEnacted: 0,
  }));

  rank(rows, "billsSponsored", "rankSponsored");
  rank(rows, "billsEnacted", "rankEnacted");

  const map = new Map(rows.map((row) => [row.slug, row]));
  await writeJsonFile(path.join(PROCESSED_DIR, "member-metrics.json"), rows);
  console.log(`[build-metrics] wrote metrics for ${rows.length} members`);

  return map;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildMetrics().catch((error) => {
    console.error("[build-metrics] failed", error);
    process.exitCode = 1;
  });
}
