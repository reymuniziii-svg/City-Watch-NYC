import { promises as fs } from "node:fs";
import path from "node:path";
import {
  PROCESSED_DIR,
  PUBLIC_DATA_DIR,
  RAW_UPSTREAM_DIR,
  SESSION_START_YEAR,
  SESSION_END_YEAR,
} from "./lib/constants";
import { readJsonFile, writeJsonFile, fileExists } from "./lib/fs-utils";
import { parseCommitteeAssignments, type RawPerson } from "./lib/legislation";
import type {
  CommitteeHeatmapEntry,
  CommitteeIndustryCell,
  MemberFinanceProfile,
  FinanceTopDonor,
} from "../src/lib/types";
import { classifyIndustry } from "./build-finance";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Member {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Build Committee Heatmap                                           */
/* ------------------------------------------------------------------ */

export async function buildCommitteeHeatmap(): Promise<void> {
  console.log("[build-committee-heatmap] starting...");

  const start = `${SESSION_START_YEAR}-01-01T00:00:00Z`;
  const end = `${SESSION_END_YEAR}-12-31T23:59:59Z`;

  // 1. Load members, filter to seated
  const members = (
    await readJsonFile<Member[]>(path.join(PUBLIC_DATA_DIR, "members-index.json"))
  ).filter((m) => m.status === "seated");
  console.log(`[build-committee-heatmap] ${members.length} seated members`);

  // 2. Load raw person data and parse committee assignments
  const membersBySlug = new Map(members.map((m) => [m.slug, m]));
  const committeesByMember = new Map<string, string[]>();

  const peopleDir = path.join(RAW_UPSTREAM_DIR, "people");
  const personFiles = (await fs.readdir(peopleDir)).filter((f) => f.endsWith(".json"));

  for (const file of personFiles) {
    const person = await readJsonFile<RawPerson>(path.join(peopleDir, file));
    if (!membersBySlug.has(person.Slug)) continue;

    const assignments = parseCommitteeAssignments(person, start, end);
    if (assignments.length > 0) {
      committeesByMember.set(
        person.Slug,
        assignments.map((a) => a.bodyName),
      );
    }
  }
  console.log(`[build-committee-heatmap] ${committeesByMember.size} members with committee assignments`);

  // 3. Build a map: committee -> industry -> aggregated data
  // Intermediate accumulator: committee -> industry -> { totalAmount, donors Set, members Map<slug, amount> }
  const heatmap = new Map<
    string,
    Map<
      string,
      {
        totalAmount: number;
        donors: Set<string>;
        members: Map<string, { slug: string; name: string; amount: number }>;
      }
    >
  >();

  // Track which members are on each committee
  const committeeMemberSlugs = new Map<string, Set<string>>();

  for (const [slug, committees] of committeesByMember.entries()) {
    const member = membersBySlug.get(slug);
    if (!member) continue;

    // Track committee membership
    for (const committee of committees) {
      const memberSet = committeeMemberSlugs.get(committee) ?? new Set<string>();
      memberSet.add(slug);
      committeeMemberSlugs.set(committee, memberSet);
    }

    // Load finance profile
    const financePath = path.join(PUBLIC_DATA_DIR, "finance", `${slug}.json`);
    if (!(await fileExists(financePath))) continue;

    const finance = await readJsonFile<MemberFinanceProfile>(financePath);

    // Collect all donors by industry from donorsByIndustry
    for (const [industryLabel, donors] of Object.entries(finance.donorsByIndustry ?? {})) {
      for (const donor of donors) {
        const industry = classifyIndustry(donor.occupation ?? "", donor.employer ?? "");
        if (industry === "Other / Mixed") continue;

        // Add to every committee this member is on
        for (const committee of committees) {
          let committeeMap = heatmap.get(committee);
          if (!committeeMap) {
            committeeMap = new Map();
            heatmap.set(committee, committeeMap);
          }

          let cell = committeeMap.get(industry);
          if (!cell) {
            cell = { totalAmount: 0, donors: new Set(), members: new Map() };
            committeeMap.set(industry, cell);
          }

          cell.totalAmount += donor.amount;
          cell.donors.add(donor.name);

          const existing = cell.members.get(slug);
          if (existing) {
            existing.amount += donor.amount;
          } else {
            cell.members.set(slug, { slug, name: member.fullName, amount: donor.amount });
          }
        }
      }
    }

    // Also include topDonors that may not be in donorsByIndustry
    for (const donor of finance.topDonors ?? []) {
      const industry = classifyIndustry(donor.occupation ?? "", donor.employer ?? "");
      if (industry === "Other / Mixed") continue;

      for (const committee of committees) {
        let committeeMap = heatmap.get(committee);
        if (!committeeMap) {
          committeeMap = new Map();
          heatmap.set(committee, committeeMap);
        }

        let cell = committeeMap.get(industry);
        if (!cell) {
          cell = { totalAmount: 0, donors: new Set(), members: new Map() };
          committeeMap.set(industry, cell);
        }

        // Only add if not already counted via donorsByIndustry
        if (!cell.donors.has(donor.name)) {
          cell.totalAmount += donor.amount;
          cell.donors.add(donor.name);

          const existing = cell.members.get(slug);
          if (existing) {
            existing.amount += donor.amount;
          } else {
            cell.members.set(slug, { slug, name: member.fullName, amount: donor.amount });
          }
        }
      }
    }
  }

  // 4. Convert to output format
  const entries: CommitteeHeatmapEntry[] = [];

  for (const [committee, industryMap] of heatmap.entries()) {
    const industries: CommitteeIndustryCell[] = [];
    let totalFunding = 0;

    for (const [industry, cell] of industryMap.entries()) {
      const topMembers = [...cell.members.values()]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      industries.push({
        industry,
        totalAmount: cell.totalAmount,
        donorCount: cell.donors.size,
        memberCount: cell.members.size,
        topMembers,
      });

      totalFunding += cell.totalAmount;
    }

    // Sort industries by totalAmount descending
    industries.sort((a, b) => b.totalAmount - a.totalAmount);

    const memberCount = committeeMemberSlugs.get(committee)?.size ?? 0;

    entries.push({
      committee,
      industries,
      totalFunding,
      memberCount,
    });
  }

  // Sort by totalFunding descending
  entries.sort((a, b) => b.totalFunding - a.totalFunding);

  // 5. Write output
  const processedPath = path.join(PROCESSED_DIR, "committee-industry-heatmap.json");
  const publicPath = path.join(PUBLIC_DATA_DIR, "committee-industry-heatmap.json");
  await writeJsonFile(processedPath, entries);
  await writeJsonFile(publicPath, entries);
  console.log(`[build-committee-heatmap] wrote ${entries.length} committees to ${publicPath}`);
}

/* ------------------------------------------------------------------ */
/*  CLI entry                                                         */
/* ------------------------------------------------------------------ */

if (import.meta.url === `file://${process.argv[1]}`) {
  buildCommitteeHeatmap().catch((error) => {
    console.error("[build-committee-heatmap] failed", error);
    process.exitCode = 1;
  });
}
