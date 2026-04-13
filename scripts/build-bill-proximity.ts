import { promises as fs } from "node:fs";
import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { readJsonFile, writeJsonFile, fileExists } from "./lib/fs-utils";
import { classifyIndustry } from "./build-finance";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface BillIndexEntry {
  billId: string;
  introNumber: string;
  title: string;
  committee: string;
  session: number;
  number: string;
  leadSponsorSlug: string | null;
}

interface BillFull {
  billId: string;
  introNumber: string;
  title: string;
  committee: string;
  sponsors: { slug: string; fullName: string }[];
  leadSponsorSlug: string | null;
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

interface ProximityDonor {
  name: string;
  industry: string;
  totalAmount: number;
  memberSlugs: string[];
}

interface BillDonorProximityEntry {
  billId: string;
  introNumber: string;
  title: string;
  committee: string;
  sponsors: { slug: string; name: string }[];
  topDonors: ProximityDonor[];
}

/* ------------------------------------------------------------------ */
/*  Build Bill-Donor Proximity                                        */
/* ------------------------------------------------------------------ */

export async function buildBillProximity(): Promise<void> {
  console.log("[build-bill-proximity] starting...");

  // 1. Load bills-index
  const billsIndex = await readJsonFile<BillIndexEntry[]>(
    path.join(PUBLIC_DATA_DIR, "bills-index.json"),
  );
  console.log(`[build-bill-proximity] ${billsIndex.length} bills in index`);

  // 2. Cache finance profiles as they're loaded
  const financeCache = new Map<string, FinanceProfile | null>();

  async function loadFinance(slug: string): Promise<FinanceProfile | null> {
    if (financeCache.has(slug)) {
      return financeCache.get(slug) ?? null;
    }
    const financePath = path.join(PUBLIC_DATA_DIR, "finance", `${slug}.json`);
    if (!(await fileExists(financePath))) {
      financeCache.set(slug, null);
      return null;
    }
    try {
      const profile = await readJsonFile<FinanceProfile>(financePath);
      financeCache.set(slug, profile);
      return profile;
    } catch {
      financeCache.set(slug, null);
      return null;
    }
  }

  // 3. Process each bill
  const results: BillDonorProximityEntry[] = [];

  for (const indexEntry of billsIndex) {
    if (!indexEntry.leadSponsorSlug) {
      continue;
    }

    // Load full bill from processed dir to get full sponsor list
    const billPath = path.join(
      PROCESSED_DIR,
      "bills",
      String(indexEntry.session),
      `${indexEntry.number}.json`,
    );

    let bill: BillFull;
    try {
      bill = await readJsonFile<BillFull>(billPath);
    } catch {
      continue;
    }

    if (!bill.sponsors || bill.sponsors.length === 0) {
      continue;
    }

    // Collect all donors across all sponsors
    // donorName -> { amount, industry, memberSlugs }
    const donorAcc = new Map<
      string,
      { amount: number; industry: string; memberSlugs: Set<string> }
    >();

    let hasFinanceData = false;

    for (const sponsor of bill.sponsors) {
      if (!sponsor.slug) {
        continue;
      }

      const finance = await loadFinance(sponsor.slug);
      if (!finance) {
        continue;
      }
      hasFinanceData = true;

      // Collect all unique donors from this sponsor's profile
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

      for (const donor of donorsByName.values()) {
        const industry = classifyIndustry(donor.occupation ?? "", donor.employer ?? "");
        const existing = donorAcc.get(donor.name);
        if (existing) {
          existing.amount += donor.amount;
          existing.memberSlugs.add(sponsor.slug);
        } else {
          donorAcc.set(donor.name, {
            amount: donor.amount,
            industry,
            memberSlugs: new Set([sponsor.slug]),
          });
        }
      }
    }

    if (!hasFinanceData) {
      continue;
    }

    // Rank top 10 donors by total amount
    const topDonors: ProximityDonor[] = Array.from(donorAcc.entries())
      .map(([name, acc]) => ({
        name,
        industry: acc.industry,
        totalAmount: Math.round(acc.amount * 100) / 100,
        memberSlugs: Array.from(acc.memberSlugs),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    results.push({
      billId: bill.billId,
      introNumber: bill.introNumber,
      title: bill.title,
      committee: bill.committee ?? "",
      sponsors: bill.sponsors
        .filter((s) => s.slug)
        .map((s) => ({ slug: s.slug, name: s.fullName })),
      topDonors,
    });
  }

  // 4. Write output
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "bill-donor-proximity.json"), results);
  console.log(`[build-bill-proximity] wrote ${results.length} entries to bill-donor-proximity.json`);
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
