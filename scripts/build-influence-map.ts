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

interface LobbyingConnection {
  lobbyistName: string;
  clientName: string;
  clientIndustry: string;
  totalSpending: number;
  overlappingBills: string[];
}

interface MemberLobbyingData {
  memberSlug: string;
  memberName: string;
  updatedAt: string;
  totalLobbyingSpending: number;
  uniqueClients: number;
  uniqueFirms: number;
  topClients: {
    clientName: string;
    clientIndustry: string;
    lobbyistName: string;
    totalSpending: number;
    reportCount: number;
    subjects: string[];
    relatedBills: { introNumber: string; title: string; position: string }[];
  }[];
  topIndustries: { industry: string; totalSpending: number; clientCount: number }[];
  recentFilings: {
    lobbyistName: string;
    clientName: string;
    period: string;
    reportYear: number;
    compensationTotal: number;
    endDate: string;
  }[];
}

interface InfluenceMapEntry {
  memberSlug: string;
  memberName: string;
  districtNumber: number;
  donorName: string;
  donorIndustry: string;
  totalAmount: number;
  relatedBills: RelatedBill[];
  lobbyingConnections?: LobbyingConnection[];
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
  lobbyingActivity?: {
    lobbyistName: string;
    clientName: string;
    clientIndustry: string;
    totalSpending: number;
    period: string;
    reportYear: number;
  };
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

  // 4b. Cross-reference with lobbying data
  const lobbyingDir = path.join(PUBLIC_DATA_DIR, "lobbying", "members");
  const lobbyingCache = new Map<string, MemberLobbyingData | null>();

  async function loadMemberLobbying(slug: string): Promise<MemberLobbyingData | null> {
    if (lobbyingCache.has(slug)) return lobbyingCache.get(slug)!;
    const filePath = path.join(lobbyingDir, `${slug}.json`);
    if (!(await fileExists(filePath))) {
      lobbyingCache.set(slug, null);
      return null;
    }
    try {
      const data = await readJsonFile<MemberLobbyingData>(filePath);
      lobbyingCache.set(slug, data);
      return data;
    } catch {
      lobbyingCache.set(slug, null);
      return null;
    }
  }

  if (await fileExists(lobbyingDir)) {
    let connectionCount = 0;
    for (const entry of entryMap.values()) {
      const lobbyingProfile = await loadMemberLobbying(entry.memberSlug);
      if (!lobbyingProfile) continue;

      const entryBillIntros = new Set(entry.relatedBills.map((b) => b.introNumber));
      const connections: LobbyingConnection[] = [];

      for (const client of lobbyingProfile.topClients) {
        // Match: lobbying client industry aligns with donor industry
        if (client.clientIndustry !== entry.donorIndustry) continue;

        // Find bills that overlap between the influence entry and the lobbying client
        const overlapping = client.relatedBills
          .map((b) => b.introNumber)
          .filter((intro) => entryBillIntros.has(intro));

        if (overlapping.length === 0) continue;

        connections.push({
          lobbyistName: client.lobbyistName,
          clientName: client.clientName,
          clientIndustry: client.clientIndustry,
          totalSpending: client.totalSpending,
          overlappingBills: overlapping,
        });
      }

      if (connections.length > 0) {
        entry.lobbyingConnections = connections;
        connectionCount += connections.length;
      }
    }
    console.log(`[build-influence-map] attached ${connectionCount} lobbying connections to influence entries`);
  } else {
    console.log("[build-influence-map] no lobbying data found, skipping cross-reference");
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

  // 3. Load lobbying profiles for cross-referencing
  const lobbyingDir = path.join(PUBLIC_DATA_DIR, "lobbying", "members");
  const hasLobbyingData = await fileExists(lobbyingDir);
  const lobbyingCache = new Map<string, MemberLobbyingData | null>();

  async function loadMemberLobbying(slug: string): Promise<MemberLobbyingData | null> {
    if (lobbyingCache.has(slug)) return lobbyingCache.get(slug)!;
    const filePath = path.join(lobbyingDir, `${slug}.json`);
    if (!(await fileExists(filePath))) {
      lobbyingCache.set(slug, null);
      return null;
    }
    try {
      const data = await readJsonFile<MemberLobbyingData>(filePath);
      lobbyingCache.set(slug, data);
      return data;
    } catch {
      lobbyingCache.set(slug, null);
      return null;
    }
  }

  // 4. Generate conflict alerts
  const alerts: ConflictAlert[] = [];
  let lobbyingEnrichCount = 0;

  for (const member of members) {
    const financePath = path.join(PUBLIC_DATA_DIR, "finance", `${member.slug}.json`);
    if (!(await fileExists(financePath))) continue;

    const finance = await readJsonFile<FinanceProfile>(financePath);
    const memberBills = billsBySponsor.get(member.slug) ?? [];
    if (memberBills.length === 0) continue;

    // Use the finance profile's updatedAt as the proxy donation date
    const donationDate = finance.updatedAt ?? now.toISOString();
    const donationTs = new Date(donationDate).getTime();

    // Pre-load lobbying profile for this member
    const lobbyingProfile = hasLobbyingData ? await loadMemberLobbying(member.slug) : null;

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

        const alert: ConflictAlert = {
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
        };

        // Cross-reference: find lobbying client with matching industry on same bill
        if (lobbyingProfile) {
          for (const client of lobbyingProfile.topClients) {
            if (client.clientIndustry !== industry) continue;
            const matchesBill = client.relatedBills.some(
              (b) => b.introNumber === bill.introNumber,
            );
            if (!matchesBill) continue;

            // Find the most recent filing for this client
            const filing = lobbyingProfile.recentFilings.find(
              (f) => f.clientName === client.clientName,
            );

            alert.lobbyingActivity = {
              lobbyistName: client.lobbyistName,
              clientName: client.clientName,
              clientIndustry: client.clientIndustry,
              totalSpending: client.totalSpending,
              period: filing?.period ?? "",
              reportYear: filing?.reportYear ?? 0,
            };
            lobbyingEnrichCount++;
            break; // use the first (highest-spending) matching client
          }
        }

        alerts.push(alert);
      }
    }
  }

  if (hasLobbyingData) {
    console.log(`[build-conflict-alerts] enriched ${lobbyingEnrichCount} alerts with lobbying activity`);
  }

  // 5. Sort by abs(daysDelta) ascending (closest temporal matches first)
  alerts.sort((a, b) => Math.abs(a.daysDelta) - Math.abs(b.daysDelta));

  // 6. Write output
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
