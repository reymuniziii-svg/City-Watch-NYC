import path from "node:path";
import { PUBLIC_DATA_DIR } from "./lib/constants.ts";
import { readJsonFile, writeJsonFile, fileExists } from "./lib/fs-utils.ts";
import { classifyIndustry } from "./build-finance.ts";
import { getIndustriesForCommittee } from "./lib/committee-topics.ts";

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

interface Bill {
  billId: string;
  introNumber: string;
  title: string;
  summary: string;
  statusName: string;
  introDate: string;
  actionDate: string;
  leadSponsorSlug: string;
  sponsorCount: number;
  committee: string;
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
  updatedAt: string;
  cycle: string;
  topDonors: Donor[];
  donorsByIndustry: Record<string, Donor[]>;
}

interface RelatedBill {
  introNumber: string;
  title: string;
  committee: string;
  introDate: string;
}

interface InfluenceMapEntry {
  memberSlug: string;
  memberName: string;
  districtNumber: number;
  donorName: string;
  donorIndustry: string;
  totalAmount: number;
  relatedBills: RelatedBill[];
}

interface ConflictAlert {
  memberSlug: string;
  memberName: string;
  donorName: string;
  donorIndustry: string;
  donationAmount: number;
  donationDate: string;
  billIntroNumber: string;
  billTitle: string;
  billIntroDate: string;
  daysDelta: number;
}

/* ------------------------------------------------------------------ */
/*  Build Influence Map                                               */
/* ------------------------------------------------------------------ */

export async function buildInfluenceMap(): Promise<void> {
  console.log("[build-influence-map] starting...");

  // 1. Load members, filter to seated
  const members = (
    await readJsonFile<Member[]>(path.join(PUBLIC_DATA_DIR, "members-index.json"))
  ).filter((m) => m.status === "seated");
  console.log(`[build-influence-map] ${members.length} seated members`);

  // 2. Load bills
  const bills = await readJsonFile<Bill[]>(path.join(PUBLIC_DATA_DIR, "bills-index.json"));
  console.log(`[build-influence-map] ${bills.length} bills loaded`);

  // Index bills by leadSponsorSlug for fast lookup
  const billsBySponsor = new Map<string, Bill[]>();
  for (const bill of bills) {
    if (!bill.leadSponsorSlug) continue;
    const list = billsBySponsor.get(bill.leadSponsorSlug) ?? [];
    list.push(bill);
    billsBySponsor.set(bill.leadSponsorSlug, list);
  }

  // 3. Process each member
  const entryMap = new Map<string, InfluenceMapEntry>();

  for (const member of members) {
    const financePath = path.join(PUBLIC_DATA_DIR, "finance", `${member.slug}.json`);
    if (!(await fileExists(financePath))) continue;

    const finance = await readJsonFile<FinanceProfile>(financePath);
    const memberBills = billsBySponsor.get(member.slug) ?? [];
    if (memberBills.length === 0) continue;

    // Collect all unique donors: topDonors + all donorsByIndustry entries
    const donorsByName = new Map<string, Donor>();
    for (const donor of finance.topDonors ?? []) {
      donorsByName.set(donor.name, donor);
    }
    for (const donors of Object.values(finance.donorsByIndustry ?? {})) {
      for (const donor of donors) {
        // Keep the entry with the higher amount if duplicate name
        const existing = donorsByName.get(donor.name);
        if (!existing || donor.amount > existing.amount) {
          donorsByName.set(donor.name, donor);
        }
      }
    }

    // For each donor, classify and match against sponsored bill committees
    for (const donor of donorsByName.values()) {
      const industry = classifyIndustry(donor.occupation ?? "", donor.employer ?? "");
      if (industry === "Other / Mixed") continue; // skip unclassifiable

      // Find bills where committee maps to donor's industry
      const matchingBills: RelatedBill[] = [];
      for (const bill of memberBills) {
        if (!bill.committee) continue;
        const committeeIndustries = getIndustriesForCommittee(bill.committee);
        if (committeeIndustries.includes(industry)) {
          matchingBills.push({
            introNumber: bill.introNumber,
            title: bill.title,
            committee: bill.committee,
            introDate: bill.introDate,
          });
        }
      }

      if (matchingBills.length === 0) continue;

      // Deduplicate by (memberSlug, donorName)
      const key = `${member.slug}::${donor.name}`;
      const existing = entryMap.get(key);
      if (existing) {
        // Aggregate: merge bills (avoid dupes), keep higher amount
        existing.totalAmount = Math.max(existing.totalAmount, donor.amount);
        const existingIntros = new Set(existing.relatedBills.map((b) => b.introNumber));
        for (const bill of matchingBills) {
          if (!existingIntros.has(bill.introNumber)) {
            existing.relatedBills.push(bill);
          }
        }
      } else {
        entryMap.set(key, {
          memberSlug: member.slug,
          memberName: member.fullName,
          districtNumber: member.districtNumber,
          donorName: donor.name,
          donorIndustry: industry,
          totalAmount: donor.amount,
          relatedBills: matchingBills,
        });
      }
    }
  }

  // 5. Sort by totalAmount descending
  const entries = [...entryMap.values()].sort((a, b) => b.totalAmount - a.totalAmount);

  // 6. Write output
  const outPath = path.join(PUBLIC_DATA_DIR, "influence-map.json");
  await writeJsonFile(outPath, entries);
  console.log(`[build-influence-map] wrote ${entries.length} entries to ${outPath}`);
}

/* ------------------------------------------------------------------ */
/*  Build Conflict Alerts                                             */
/* ------------------------------------------------------------------ */

export async function buildConflictAlerts(): Promise<void> {
  console.log("[build-conflict-alerts] starting...");

  const now = new Date();

  // 1. Load members, filter to seated
  const members = (
    await readJsonFile<Member[]>(path.join(PUBLIC_DATA_DIR, "members-index.json"))
  ).filter((m) => m.status === "seated");

  // 2. Load bills
  const bills = await readJsonFile<Bill[]>(path.join(PUBLIC_DATA_DIR, "bills-index.json"));

  // Index bills by leadSponsorSlug
  const billsBySponsor = new Map<string, Bill[]>();
  for (const bill of bills) {
    if (!bill.leadSponsorSlug) continue;
    const list = billsBySponsor.get(bill.leadSponsorSlug) ?? [];
    list.push(bill);
    billsBySponsor.set(bill.leadSponsorSlug, list);
  }

  // 3. Generate conflict alerts
  const alerts: ConflictAlert[] = [];

  for (const member of members) {
    const financePath = path.join(PUBLIC_DATA_DIR, "finance", `${member.slug}.json`);
    if (!(await fileExists(financePath))) continue;

    const finance = await readJsonFile<FinanceProfile>(financePath);
    const memberBills = billsBySponsor.get(member.slug) ?? [];
    if (memberBills.length === 0) continue;

    // Use the finance profile's updatedAt as the proxy donation date
    const donationDate = finance.updatedAt ?? now.toISOString();
    const donationTs = new Date(donationDate).getTime();

    // Collect all unique donors
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

    // For each donor, check for industry-committee matches with bills
    for (const donor of donorsByName.values()) {
      const industry = classifyIndustry(donor.occupation ?? "", donor.employer ?? "");
      if (industry === "Other / Mixed") continue;

      for (const bill of memberBills) {
        if (!bill.committee || !bill.introDate) continue;
        const committeeIndustries = getIndustriesForCommittee(bill.committee);
        if (!committeeIndustries.includes(industry)) continue;

        const introTs = new Date(bill.introDate).getTime();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysDelta = Math.round((donationTs - introTs) / msPerDay);

        alerts.push({
          memberSlug: member.slug,
          memberName: member.fullName,
          donorName: donor.name,
          donorIndustry: industry,
          donationAmount: donor.amount,
          donationDate,
          billIntroNumber: bill.introNumber,
          billTitle: bill.title,
          billIntroDate: bill.introDate,
          daysDelta,
        });
      }
    }
  }

  // 4. Sort by abs(daysDelta) ascending (closest temporal matches first)
  alerts.sort((a, b) => Math.abs(a.daysDelta) - Math.abs(b.daysDelta));

  // 5. Write output
  const outPath = path.join(PUBLIC_DATA_DIR, "conflict-alerts.json");
  await writeJsonFile(outPath, alerts);
  console.log(`[build-conflict-alerts] wrote ${alerts.length} alerts to ${outPath}`);
}

/* ------------------------------------------------------------------ */
/*  CLI entry                                                         */
/* ------------------------------------------------------------------ */

if (import.meta.url === `file://${process.argv[1]}`) {
  buildInfluenceMap()
    .then(() => buildConflictAlerts())
    .catch((error) => {
      console.error("[build-influence-map] failed", error);
      process.exitCode = 1;
    });
}
