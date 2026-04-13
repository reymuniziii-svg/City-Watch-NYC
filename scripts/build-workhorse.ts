import { promises as fs } from "node:fs";
import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR, SESSION_END_YEAR, SESSION_START_YEAR } from "./lib/constants";
import { readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { isEnactedStatus } from "../src/lib/status-timeline";
import type { BillRecord } from "../src/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MemberIndex {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  billsSponsored: number;
  billsEnacted: number;
  status: string;
}

interface WorkHorseEntry {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
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

interface VelocityEntry {
  billId: string;
  introNumber: string;
  title: string;
  sponsorSlug: string;
  committee: string;
  sponsorCount: number;
  introDate: string;
  daysToThreshold: number | null;
  committeeMeanDays: number | null;
  velocityNorm: number | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const CO_SPONSOR_THRESHOLD = 5;

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

function daysBetween(a: string, b: string): number | null {
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
    return null;
  }
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/*  Build Work Horse                                                  */
/* ------------------------------------------------------------------ */

export async function buildWorkHorse(): Promise<void> {
  console.log("[build-workhorse] starting...");

  // 1. Load members-index to build slug-to-party map and get seated members
  const membersIndex = await readJsonFile<MemberIndex[]>(
    path.join(PUBLIC_DATA_DIR, "members-index.json"),
  );
  const seatedMembers = membersIndex.filter((m) => m.status === "seated");
  const slugToParty = new Map<string, string>();
  const slugToMember = new Map<string, MemberIndex>();
  for (const m of membersIndex) {
    if (m.slug) {
      slugToParty.set(m.slug, m.party);
      slugToMember.set(m.slug, m);
    }
  }
  const seatedSlugs = new Set(seatedMembers.map((m) => m.slug));

  // 2. Load all processed bills
  const billFiles = await listBillFiles();
  const allBills: BillRecord[] = [];
  for (const file of billFiles) {
    const bill = await readJsonFile<BillRecord>(file);
    allBills.push(bill);
  }
  console.log(`[build-workhorse] loaded ${allBills.length} bills`);

  // 3. Per-member accumulators
  const memberBills = new Map<string, BillRecord[]>();
  for (const bill of allBills) {
    if (!bill.leadSponsorSlug || !seatedSlugs.has(bill.leadSponsorSlug)) {
      continue;
    }
    const list = memberBills.get(bill.leadSponsorSlug) ?? [];
    list.push(bill);
    memberBills.set(bill.leadSponsorSlug, list);
  }

  // 4. Compute committee mean velocity (days from intro to reaching CO_SPONSOR_THRESHOLD)
  //    Group by committee, compute mean days per committee
  const committeeVelocities = new Map<string, number[]>();
  const billVelocityData: VelocityEntry[] = [];

  for (const bill of allBills) {
    if (!bill.introDate || !bill.committee || bill.sponsorCount < CO_SPONSOR_THRESHOLD) {
      continue;
    }

    // Use actionDate as proxy for when sponsor threshold was reached
    // (exact per-sponsor timeline isn't available; actionDate is the last action)
    const days = daysBetween(bill.introDate, bill.actionDate);
    if (days === null || days < 0) {
      continue;
    }

    const list = committeeVelocities.get(bill.committee) ?? [];
    list.push(days);
    committeeVelocities.set(bill.committee, list);
  }

  const committeeMeanDays = new Map<string, number>();
  for (const [committee, daysList] of committeeVelocities.entries()) {
    if (daysList.length > 0) {
      const mean = daysList.reduce((sum, d) => sum + d, 0) / daysList.length;
      committeeMeanDays.set(committee, mean);
    }
  }

  // 5. Build per-bill velocity entries
  for (const bill of allBills) {
    if (!bill.leadSponsorSlug || !seatedSlugs.has(bill.leadSponsorSlug)) {
      continue;
    }

    const daysToThreshold =
      bill.sponsorCount >= CO_SPONSOR_THRESHOLD && bill.introDate
        ? daysBetween(bill.introDate, bill.actionDate)
        : null;

    const cmDays = bill.committee ? committeeMeanDays.get(bill.committee) ?? null : null;

    let velocityNorm: number | null = null;
    if (daysToThreshold !== null && cmDays !== null && cmDays > 0) {
      // faster = higher: ratio inverted, clamped 0-1
      velocityNorm = Math.max(0, Math.min(1, 1 - daysToThreshold / (cmDays * 2)));
    }

    billVelocityData.push({
      billId: bill.billId,
      introNumber: bill.introNumber,
      title: bill.title,
      sponsorSlug: bill.leadSponsorSlug,
      committee: bill.committee,
      sponsorCount: bill.sponsorCount,
      introDate: bill.introDate,
      daysToThreshold,
      committeeMeanDays: cmDays !== null ? Math.round(cmDays * 10) / 10 : null,
      velocityNorm: velocityNorm !== null ? Math.round(velocityNorm * 1000) / 1000 : null,
    });
  }

  // 6. Compute per-member scores
  const results: WorkHorseEntry[] = [];

  for (const member of seatedMembers) {
    const bills = memberBills.get(member.slug) ?? [];
    const totalSponsored = bills.length;

    if (totalSponsored === 0) {
      results.push({
        slug: member.slug,
        fullName: member.fullName,
        districtNumber: member.districtNumber,
        party: member.party,
        successRate: 0,
        committeePullRate: 0,
        bipartisanReachRate: 0,
        velocityScore: 0,
        compositeScore: 0,
        rank: 0,
        billBreakdown: { introduced: 0, passedCommittee: 0, enacted: 0, bipartisanBills: 0 },
      });
      continue;
    }

    // --- successRate ---
    const enacted = bills.filter((b) => isEnactedStatus(b.statusName)).length;
    const successRate = totalSponsored > 0 ? enacted / totalSponsored : 0;

    // --- committeePullRate ---
    // Count bills with a timeline step whose label is "Voted (Committee)"
    const passedCommittee = bills.filter((b) =>
      b.timeline.some((step) => step.label === "Voted (Committee)"),
    ).length;
    const committeePullRate = totalSponsored > 0 ? passedCommittee / totalSponsored : 0;

    // --- bipartisanReachRate ---
    const memberParty = member.party;
    let totalCoSponsors = 0;
    let bipartisanCoSponsors = 0;
    let bipartisanBills = 0;

    for (const bill of bills) {
      const coSponsors = bill.sponsors.filter((s) => s.slug !== bill.leadSponsorSlug);
      let billHasBipartisan = false;

      for (const coSponsor of coSponsors) {
        const coParty = slugToParty.get(coSponsor.slug);
        if (!coParty) {
          continue;
        }
        totalCoSponsors += 1;
        if (coParty !== memberParty) {
          bipartisanCoSponsors += 1;
          billHasBipartisan = true;
        }
      }

      if (billHasBipartisan) {
        bipartisanBills += 1;
      }
    }
    const bipartisanReachRate = totalCoSponsors > 0 ? bipartisanCoSponsors / totalCoSponsors : 0;

    // --- velocityScore ---
    const memberVelocities = billVelocityData
      .filter((v) => v.sponsorSlug === member.slug && v.velocityNorm !== null)
      .map((v) => v.velocityNorm!);
    const velocityScore =
      memberVelocities.length > 0
        ? memberVelocities.reduce((sum, v) => sum + v, 0) / memberVelocities.length
        : 0;

    // --- compositeScore ---
    const compositeScore =
      (successRate * 0.35 +
        committeePullRate * 0.3 +
        bipartisanReachRate * 0.2 +
        velocityScore * 0.15) *
      100;

    results.push({
      slug: member.slug,
      fullName: member.fullName,
      districtNumber: member.districtNumber,
      party: member.party,
      successRate: Math.round(successRate * 1000) / 1000,
      committeePullRate: Math.round(committeePullRate * 1000) / 1000,
      bipartisanReachRate: Math.round(bipartisanReachRate * 1000) / 1000,
      velocityScore: Math.round(velocityScore * 1000) / 1000,
      compositeScore: Math.round(compositeScore * 100) / 100,
      rank: 0,
      billBreakdown: {
        introduced: totalSponsored,
        passedCommittee,
        enacted,
        bipartisanBills,
      },
    });
  }

  // 7. Rank by compositeScore descending
  results.sort((a, b) => b.compositeScore - a.compositeScore || a.slug.localeCompare(b.slug));
  results.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  // 8. Write outputs
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "workhorse-index.json"), results);
  console.log(`[build-workhorse] wrote ${results.length} entries to workhorse-index.json`);

  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "workhorse-velocity.json"), billVelocityData);
  console.log(`[build-workhorse] wrote ${billVelocityData.length} entries to workhorse-velocity.json`);
}

/* ------------------------------------------------------------------ */
/*  CLI entry                                                         */
/* ------------------------------------------------------------------ */

if (import.meta.url === `file://${process.argv[1]}`) {
  buildWorkHorse().catch((error) => {
    console.error("[build-workhorse] failed", error);
    process.exitCode = 1;
  });
}
