import { promises as fs } from "node:fs";
import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { readJsonFile, writeJsonFile } from "./lib/fs-utils";
import type { BillRecord, BillVelocityEntry, BillVelocityPoint, WorkHorseEntry } from "../src/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MemberIndexRow {
  slug: string | null;
  fullName: string;
  districtNumber: number;
  party: string;
  status: string;
}

interface MetricRow {
  slug: string;
  billsSponsored: number;
  billsEnacted: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const COMMITTEE_VOTE_PATTERN = /Approved by Committee|Committee Vote/i;

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

/** Load all processed bill detail files. */
async function loadAllBills(): Promise<BillRecord[]> {
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
    if (!stats.isDirectory()) continue;

    const files = (await fs.readdir(yearDir)).filter((n) => n.endsWith(".json"));
    for (const file of files) {
      results.push(await readJsonFile<BillRecord>(path.join(yearDir, file)));
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/*  Core Computation                                                  */
/* ------------------------------------------------------------------ */

export async function buildWorkHorse(): Promise<void> {
  console.log("[build-workhorse] starting...");

  // 1. Load members index for party lookup and member list
  const members = await readJsonFile<MemberIndexRow[]>(
    path.join(PUBLIC_DATA_DIR, "members-index.json"),
  );
  const seatedMembers = members.filter((m) => m.status === "seated" && m.slug);
  const partyBySlug = new Map(members.map((m) => [m.slug, m.party]));
  const memberBySlug = new Map(seatedMembers.map((m) => [m.slug!, m]));

  console.log(`[build-workhorse] ${seatedMembers.length} seated members`);

  // 2. Load existing metrics for base counts
  let metrics: MetricRow[] = [];
  try {
    metrics = await readJsonFile<MetricRow[]>(path.join(PROCESSED_DIR, "member-metrics.json"));
  } catch {
    // ignore
  }
  const metricBySlug = new Map(metrics.map((m) => [m.slug, m]));

  // 3. Load all bills
  const bills = await loadAllBills();
  console.log(`[build-workhorse] ${bills.length} bills loaded`);

  // Index bills by lead sponsor
  const billsByLeadSponsor = new Map<string, BillRecord[]>();
  for (const bill of bills) {
    if (!bill.leadSponsorSlug) continue;
    const list = billsByLeadSponsor.get(bill.leadSponsorSlug) ?? [];
    list.push(bill);
    billsByLeadSponsor.set(bill.leadSponsorSlug, list);
  }

  // 4. Compute per-committee velocity baselines (mean days to reach co-sponsor milestones)
  const committeeBills = new Map<string, BillRecord[]>();
  for (const bill of bills) {
    if (!bill.committee) continue;
    const list = committeeBills.get(bill.committee) ?? [];
    list.push(bill);
    committeeBills.set(bill.committee, list);
  }

  // For each committee, compute mean "days from intro to committee vote"
  const committeeMeanDays = new Map<string, number>();
  for (const [committee, cBills] of committeeBills) {
    const daysValues: number[] = [];
    for (const bill of cBills) {
      if (!bill.introDate) continue;
      const committeeVoteStep = bill.timeline.find((step) =>
        COMMITTEE_VOTE_PATTERN.test(step.action),
      );
      if (committeeVoteStep?.date) {
        const days = daysBetween(bill.introDate, committeeVoteStep.date);
        if (days > 0) daysValues.push(days);
      }
    }
    if (daysValues.length > 0) {
      committeeMeanDays.set(
        committee,
        Math.round(daysValues.reduce((a, b) => a + b, 0) / daysValues.length),
      );
    }
  }

  // 5. Compute per-member Work Horse metrics
  const velocityEntries: BillVelocityEntry[] = [];
  const entries: WorkHorseEntry[] = [];

  for (const member of seatedMembers) {
    const slug = member.slug!;
    const memberBills = billsByLeadSponsor.get(slug) ?? [];
    const metric = metricBySlug.get(slug);

    // --- Success Rate ---
    const introduced = metric?.billsSponsored ?? memberBills.length;
    const enacted = metric?.billsEnacted ?? 0;
    const successRate = introduced > 0 ? enacted / introduced : 0;

    // --- Committee Pull ---
    let passedCommittee = 0;
    for (const bill of memberBills) {
      const hasCommitteeVote = bill.timeline.some((step) =>
        COMMITTEE_VOTE_PATTERN.test(step.action),
      );
      if (hasCommitteeVote) passedCommittee++;
    }
    const committeePullRate = introduced > 0 ? passedCommittee / introduced : 0;

    // --- Bipartisan Reach ---
    const memberParty = member.party;
    let bipartisanBills = 0;
    for (const bill of memberBills) {
      if (bill.sponsors.length <= 1) continue;
      const hasCrossParty = bill.sponsors.some((sponsor) => {
        if (!sponsor.slug || sponsor.slug === slug) return false;
        const sponsorParty = partyBySlug.get(sponsor.slug);
        return sponsorParty && sponsorParty !== memberParty && sponsorParty !== "Unknown";
      });
      if (hasCrossParty) bipartisanBills++;
    }
    const bipartisanReachRate =
      memberBills.length > 0 ? bipartisanBills / memberBills.length : 0;

    // --- Velocity Score ---
    // Compute normalized velocity: how quickly bills gain co-sponsors vs committee mean
    const velocityRatios: number[] = [];
    for (const bill of memberBills) {
      if (!bill.introDate || !bill.committee || bill.sponsors.length <= 1) continue;

      // Build co-sponsor timeline from bill history
      const timeline: BillVelocityPoint[] = [
        { date: bill.introDate, count: 1 },
      ];

      // Use timeline steps to approximate co-sponsor growth
      // Each substantive action date gets the running sponsor count
      const sortedSteps = [...bill.timeline]
        .filter((s) => s.date)
        .sort((a, b) => a.date.localeCompare(b.date));

      for (const step of sortedSteps) {
        if (step.date <= bill.introDate) continue;
        timeline.push({ date: step.date, count: bill.sponsorCount });
      }

      // Final state
      if (timeline.length === 1) {
        timeline.push({
          date: bill.actionDate || bill.introDate,
          count: bill.sponsorCount,
        });
      }

      // Compute days to reach final co-sponsor count
      const lastPoint = timeline[timeline.length - 1];
      const daysToFinal = daysBetween(bill.introDate, lastPoint.date);

      // Compare to committee mean
      const mean = committeeMeanDays.get(bill.committee);
      if (mean && daysToFinal > 0) {
        // Ratio < 1 means faster than average (good)
        velocityRatios.push(mean / daysToFinal);
      }

      // Committee mean timeline for chart
      const committeeMeanTimeline: BillVelocityPoint[] = [];
      const committeeAvgSponsors = committeeBills.get(bill.committee);
      if (committeeAvgSponsors && committeeAvgSponsors.length > 0) {
        const avgCount = Math.round(
          committeeAvgSponsors.reduce((sum, b) => sum + b.sponsorCount, 0) /
            committeeAvgSponsors.length,
        );
        committeeMeanTimeline.push({ date: bill.introDate, count: 1 });
        if (mean) {
          const meanDate = new Date(
            new Date(bill.introDate).getTime() + mean * 86400000,
          ).toISOString();
          committeeMeanTimeline.push({ date: meanDate, count: avgCount });
        }
      }

      // Days to committee vote
      const committeeVoteStep = bill.timeline.find((step) =>
        COMMITTEE_VOTE_PATTERN.test(step.action),
      );
      const daysToCommittee = committeeVoteStep?.date
        ? daysBetween(bill.introDate, committeeVoteStep.date)
        : null;

      velocityEntries.push({
        introNumber: bill.introNumber,
        title: bill.title,
        leadSponsorSlug: slug,
        committee: bill.committee,
        introDate: bill.introDate,
        sponsorTimeline: timeline,
        committeeMean: committeeMeanTimeline,
        daysToCommittee,
      });
    }

    // Normalize velocity: cap at 2.0, then scale to 0-1
    const avgVelocity =
      velocityRatios.length > 0
        ? velocityRatios.reduce((a, b) => a + b, 0) / velocityRatios.length
        : 0;
    const velocityScore = Math.min(avgVelocity / 2, 1);

    // --- Composite Score ---
    const compositeScore = Math.round(
      (successRate * 0.35 +
        committeePullRate * 0.30 +
        bipartisanReachRate * 0.20 +
        velocityScore * 0.15) *
        100,
    );

    entries.push({
      slug,
      fullName: member.fullName,
      districtNumber: member.districtNumber,
      party: member.party,
      successRate: Number(successRate.toFixed(3)),
      committeePullRate: Number(committeePullRate.toFixed(3)),
      bipartisanReachRate: Number(bipartisanReachRate.toFixed(3)),
      velocityScore: Number(velocityScore.toFixed(3)),
      compositeScore,
      rank: 0, // computed below
      billBreakdown: {
        introduced,
        passedCommittee,
        enacted,
        bipartisanBills,
      },
    });
  }

  // 6. Rank by composite score
  entries.sort((a, b) => b.compositeScore - a.compositeScore || a.slug.localeCompare(b.slug));
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  // 7. Write outputs
  await writeJsonFile(path.join(PROCESSED_DIR, "workhorse-index.json"), entries);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "workhorse-index.json"), entries);
  console.log(`[build-workhorse] wrote workhorse index for ${entries.length} members`);

  await writeJsonFile(path.join(PROCESSED_DIR, "workhorse-velocity.json"), velocityEntries);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "workhorse-velocity.json"), velocityEntries);
  console.log(`[build-workhorse] wrote ${velocityEntries.length} bill velocity entries`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildWorkHorse().catch((error) => {
    console.error("[build-workhorse] failed", error);
    process.exitCode = 1;
  });
}
