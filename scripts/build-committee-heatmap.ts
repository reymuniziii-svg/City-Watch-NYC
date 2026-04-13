import { promises as fs } from "node:fs";
import path from "node:path";
import { PUBLIC_DATA_DIR, RAW_UPSTREAM_DIR, SESSION_START_YEAR, SESSION_END_YEAR } from "./lib/constants";
import { readJsonFile, writeJsonFile, fileExists } from "./lib/fs-utils";
import { parseCommitteeAssignments, type RawPerson } from "./lib/legislation";
import { classifyIndustry } from "./build-finance";
import { COMMITTEE_INDUSTRY_MAP } from "./lib/committee-topics";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MemberIndex {
  slug: string;
  fullName: string;
  status: string;
}

interface Donor {
  name: string;
  amount: number;
  donorType: string;
  city: string;
  state: string;
  occupation: string;
  employer: string;
}

interface FinanceProfile {
  slug: string;
  topDonors: Donor[];
  donorsByIndustry: Record<string, Donor[]>;
}

interface IndustryEntry {
  industry: string;
  totalAmount: number;
  donorCount: number;
  memberCount: number;
  topMembers: { slug: string; name: string; amount: number }[];
}

interface HeatmapEntry {
  committee: string;
  industries: IndustryEntry[];
  totalFunding: number;
  memberCount: number;
}

/* ------------------------------------------------------------------ */
/*  Build Committee Heatmap                                           */
/* ------------------------------------------------------------------ */

export async function buildCommitteeHeatmap(): Promise<void> {
  console.log("[build-committee-heatmap] starting...");

  // 1. Load members-index (seated only)
  const membersIndex = await readJsonFile<MemberIndex[]>(
    path.join(PUBLIC_DATA_DIR, "members-index.json"),
  );
  const seatedMembers = membersIndex.filter((m) => m.status === "seated");
  const memberNameMap = new Map<string, string>();
  for (const m of seatedMembers) {
    memberNameMap.set(m.slug, m.fullName);
  }

  // 2. Load people files and parse committee assignments
  const sessionStart = `${SESSION_START_YEAR}-01-01T00:00:00Z`;
  const sessionEnd = `${SESSION_END_YEAR}-12-31T23:59:59Z`;

  const peopleDir = path.join(RAW_UPSTREAM_DIR, "people");
  let personFiles: string[] = [];
  try {
    personFiles = (await fs.readdir(peopleDir)).filter((name) => name.endsWith(".json"));
  } catch {
    console.log("[build-committee-heatmap] no people directory found");
    return;
  }

  // Map: committee -> Set<slug>
  const committeeMembership = new Map<string, Set<string>>();

  for (const file of personFiles) {
    const person = await readJsonFile<RawPerson>(path.join(peopleDir, file));
    if (!memberNameMap.has(person.Slug)) {
      continue;
    }

    const assignments = parseCommitteeAssignments(person, sessionStart, sessionEnd);
    for (const assignment of assignments) {
      const members = committeeMembership.get(assignment.bodyName) ?? new Set();
      members.add(person.Slug);
      committeeMembership.set(assignment.bodyName, members);
    }
  }

  // Include all committees from COMMITTEE_INDUSTRY_MAP even if no assignments found
  for (const committeeName of Object.keys(COMMITTEE_INDUSTRY_MAP)) {
    if (!committeeMembership.has(committeeName)) {
      committeeMembership.set(committeeName, new Set());
    }
  }

  console.log(`[build-committee-heatmap] found ${committeeMembership.size} committees`);

  // 3. Load finance profiles for all seated members
  const memberFinance = new Map<string, FinanceProfile>();
  for (const member of seatedMembers) {
    const financePath = path.join(PUBLIC_DATA_DIR, "finance", `${member.slug}.json`);
    if (!(await fileExists(financePath))) {
      continue;
    }
    try {
      const profile = await readJsonFile<FinanceProfile>(financePath);
      memberFinance.set(member.slug, profile);
    } catch {
      continue;
    }
  }

  // 4. For each committee, aggregate industry contributions from assigned members
  const heatmap: HeatmapEntry[] = [];

  for (const [committee, memberSlugs] of committeeMembership.entries()) {
    // industry -> { totalAmount, donors: Set<name>, members: Map<slug, amount> }
    const industryAcc = new Map<
      string,
      { totalAmount: number; donors: Set<string>; members: Map<string, number> }
    >();

    for (const slug of memberSlugs) {
      const finance = memberFinance.get(slug);
      if (!finance) {
        continue;
      }

      // Collect all unique donors from this member's finance profile
      const donorsByName = new Map<string, Donor>();
      for (const donor of finance.topDonors ?? []) {
        donorsByName.set(donor.name, donor);
      }
      for (const donors of Object.values(finance.donorsByIndustry ?? {})) {
        for (const donor of donors) {
          const existing = donorsByName.get(donor.name);
          if (!existing || donor.amount > existing.amount) {
            donorsByName.set(donor.name, donor);
          }
        }
      }

      // Classify and aggregate each donor
      for (const donor of donorsByName.values()) {
        const industry = classifyIndustry(donor.occupation ?? "", donor.employer ?? "");
        const acc = industryAcc.get(industry) ?? {
          totalAmount: 0,
          donors: new Set<string>(),
          members: new Map<string, number>(),
        };
        acc.totalAmount += donor.amount;
        acc.donors.add(donor.name);
        acc.members.set(slug, (acc.members.get(slug) ?? 0) + donor.amount);
        industryAcc.set(industry, acc);
      }
    }

    // Build industry entries sorted by totalAmount descending
    const industries: IndustryEntry[] = Array.from(industryAcc.entries())
      .map(([industry, acc]) => {
        const topMembers = Array.from(acc.members.entries())
          .map(([slug, amount]) => ({
            slug,
            name: memberNameMap.get(slug) ?? slug,
            amount: Math.round(amount * 100) / 100,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        return {
          industry,
          totalAmount: Math.round(acc.totalAmount * 100) / 100,
          donorCount: acc.donors.size,
          memberCount: acc.members.size,
          topMembers,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totalFunding = industries.reduce((sum, ind) => sum + ind.totalAmount, 0);

    heatmap.push({
      committee,
      industries,
      totalFunding: Math.round(totalFunding * 100) / 100,
      memberCount: memberSlugs.size,
    });
  }

  // Sort by totalFunding descending
  heatmap.sort((a, b) => b.totalFunding - a.totalFunding);

  // 5. Write output
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "committee-industry-heatmap.json"), heatmap);
  console.log(`[build-committee-heatmap] wrote ${heatmap.length} entries to committee-industry-heatmap.json`);
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
