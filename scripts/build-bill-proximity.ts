import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { readJsonFile, writeJsonFile, fileExists } from "./lib/fs-utils";
import { classifyIndustry } from "./build-finance";
import type { BillDonorProximity, MemberFinanceProfile, FinanceTopDonor } from "../src/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Bill {
  billId: string;
  introNumber: string;
  title: string;
  committee: string;
  leadSponsorSlug: string | null;
  sponsorCount: number;
  sponsors: { slug: string; fullName: string }[];
}

/* ------------------------------------------------------------------ */
/*  Build Bill Proximity                                              */
/* ------------------------------------------------------------------ */

export async function buildBillProximity(): Promise<void> {
  console.log("[build-bill-proximity] starting...");

  // 1. Load bills
  const bills = await readJsonFile<Bill[]>(path.join(PUBLIC_DATA_DIR, "bills-index.json"));
  console.log(`[build-bill-proximity] ${bills.length} bills loaded`);

  // Cache finance profiles to avoid repeated reads
  const financeCache = new Map<string, MemberFinanceProfile | null>();

  async function loadFinanceProfile(slug: string): Promise<MemberFinanceProfile | null> {
    if (financeCache.has(slug)) return financeCache.get(slug)!;
    const financePath = path.join(PUBLIC_DATA_DIR, "finance", `${slug}.json`);
    if (!(await fileExists(financePath))) {
      financeCache.set(slug, null);
      return null;
    }
    try {
      const data = await readJsonFile<MemberFinanceProfile>(financePath);
      financeCache.set(slug, data);
      return data;
    } catch {
      financeCache.set(slug, null);
      return null;
    }
  }

  // 2. Process each bill with a lead sponsor and sponsorCount > 1
  const results: BillDonorProximity[] = [];

  for (const bill of bills) {
    if (!bill.leadSponsorSlug || bill.sponsorCount <= 1) continue;

    // Collect all sponsor slugs
    const sponsorSlugs = bill.sponsors
      .map((s) => s.slug)
      .filter((slug) => Boolean(slug));
    if (sponsorSlugs.length === 0) continue;

    // 3. For each sponsor, load their finance profile and collect donors
    // Accumulator: donorName -> { totalAmount, industry, sponsorSlugs Set }
    const donorAgg = new Map<
      string,
      {
        totalAmount: number;
        occupation: string;
        employer: string;
        sponsorSlugs: Set<string>;
      }
    >();

    for (const slug of sponsorSlugs) {
      const finance = await loadFinanceProfile(slug);
      if (!finance) continue;

      // Collect all unique donors from topDonors and donorsByIndustry
      const donorsByName = new Map<string, FinanceTopDonor>();
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

      // Merge into bill-level aggregator
      for (const [name, donor] of donorsByName.entries()) {
        const existing = donorAgg.get(name);
        if (existing) {
          existing.totalAmount += donor.amount;
          existing.sponsorSlugs.add(slug);
        } else {
          donorAgg.set(name, {
            totalAmount: donor.amount,
            occupation: donor.occupation ?? "",
            employer: donor.employer ?? "",
            sponsorSlugs: new Set([slug]),
          });
        }
      }
    }

    // 5. Classify industry and take top 10
    const ranked = [...donorAgg.entries()]
      .map(([donorName, data]) => ({
        donorName,
        industry: classifyIndustry(data.occupation, data.employer),
        totalToSponsors: data.totalAmount,
        sponsorSlugs: [...data.sponsorSlugs].sort(),
      }))
      .sort((a, b) => b.totalToSponsors - a.totalToSponsors)
      .slice(0, 10);

    if (ranked.length === 0) continue;

    results.push({
      introNumber: bill.introNumber,
      title: bill.title,
      committee: bill.committee,
      topDonors: ranked,
    });
  }

  // Sort by number of top donors descending (bills with most cross-sponsor donors first)
  results.sort((a, b) => {
    const aMax = a.topDonors[0]?.totalToSponsors ?? 0;
    const bMax = b.topDonors[0]?.totalToSponsors ?? 0;
    return bMax - aMax;
  });

  // 7. Write output
  const processedPath = path.join(PROCESSED_DIR, "bill-donor-proximity.json");
  const publicPath = path.join(PUBLIC_DATA_DIR, "bill-donor-proximity.json");
  await writeJsonFile(processedPath, results);
  await writeJsonFile(publicPath, results);
  console.log(`[build-bill-proximity] wrote ${results.length} bills to ${publicPath}`);
}

/* ------------------------------------------------------------------ */
/*  CLI entry                                                         */
/* ------------------------------------------------------------------ */

if (import.meta.url === `file://${process.argv[1]}`) {
  buildBillProximity().catch((error) => {
    console.error("[build-bill-proximity] failed", error);
    process.exitCode = 1;
  });
}
