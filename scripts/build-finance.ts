import path from "node:path";
import {
  CFB_BASE_URL,
  CFB_CONTRIBUTIONS_URL,
  CFB_EXPENDITURES_URL,
  CFB_FINANCIAL_ANALYSIS_URL,
  CFB_PAYMENTS_URL,
  CONTENT_DIR,
  PROCESSED_DIR,
  PUBLIC_DATA_DIR,
} from "./lib/constants";
import { parseCsv } from "./lib/csv";
import { ensureDir, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import { normalizePersonName } from "./lib/normalize";
import type { ExpenditureProfile, FinanceIndustryBreakdown, FinanceTopDonor, MemberFinanceProfile } from "../src/lib/types";

interface SupplementalRow {
  slug: string | null;
  districtNumber: number;
  displayName: string;
}

interface FinanceOverrideMap {
  [slug: string]: {
    candidateName?: string;
    candidateId?: string;
  };
}

interface FinanceInsightInput {
  contributorCount: number;
  totalRaised: number | null;
  publicFunds: number | null;
  publicFundsShare: number | null;
  smallDollarAmount: number | null;
  smallDollarDonorCount: number | null;
  smallDollarShare: number | null;
  topTenDonorShare: number | null;
  maxContributionDonorCount: number | null;
  maxContributionAmount: number | null;
  organizationalDonorShare: number | null;
  outsideCityShare: number | null;
  topIndustries: FinanceIndustryBreakdown[];
}

function parseAmount(value: string): number {
  const numeric = Number.parseFloat(value.replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

function uniqueCount(values: string[]): number {
  return new Set(values.filter(Boolean)).size;
}

function parseCount(value: string | undefined): number | null {
  const numeric = Number.parseInt((value ?? "").replace(/,/g, "").trim(), 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function pctText(value: number | null): string {
  return value === null ? "N/A" : `${Math.round(value * 100)}%`;
}

function classifyIndustry(occupation: string, employer: string): string {
  const combined = `${occupation} ${employer}`.toUpperCase();

  if (/REAL ESTATE|PROPERTY|DEVELOPER|HOUSING/.test(combined)) {
    return "Real Estate";
  }

  if (/UNION|SEIU|UFT|DC37|LOCAL\s+\d+|LABOR/.test(combined)) {
    return "Labor";
  }

  if (/LAW|ATTORNEY|LEGAL|COUNSEL/.test(combined)) {
    return "Legal";
  }

  if (/FINANCE|BANK|INVEST|CAPITAL|HEDGE|WEALTH/.test(combined)) {
    return "Finance";
  }

  if (/EDUCATION|SCHOOL|TEACHER|PROFESSOR|CUNY/.test(combined)) {
    return "Education";
  }

  if (/HEALTH|HOSPITAL|MEDICAL|NURSE|DOCTOR|PHARMA/.test(combined)) {
    return "Healthcare";
  }

  if (/NONPROFIT|FOUNDATION|ADVOCACY|CHARITY/.test(combined)) {
    return "Nonprofit / Advocacy";
  }

  if (/GOVERNMENT|CITY OF NEW YORK|STATE OF NEW YORK|PUBLIC/.test(combined)) {
    return "Government / Public Sector";
  }

  if (/RESTAURANT|RETAIL|STORE|SMALL BUSINESS|OWNER|MERCHANT/.test(combined)) {
    return "Small Business / Retail";
  }

  return "Other / Mixed";
}

const EXPENDITURE_CATEGORY_LABELS: Record<string, string> = {
  WAGES: "Staff / Payroll",
  CONSL: "Consulting",
  PROFL: "Consulting",
  TVADS: "Advertising / Media",
  PRINT: "Advertising / Media",
  POLLS: "Advertising / Media",
  CMAIL: "Mail / Print",
  LITER: "Mail / Print",
  POSTA: "Mail / Print",
  FUNDR: "Events / Fundraising",
  PETIT: "Legal / Compliance",
  BCFEES: "Legal / Compliance",
};

const DIGITAL_AD_PAYEES = /\b(meta|facebook|instagram|google|youtube|twitter|x\.com|tiktok|snapchat|linkedin|reddit)\b/i;

function classifyExpenditure(purposeCode: string, payeeName: string): string {
  if (DIGITAL_AD_PAYEES.test(payeeName)) return "Advertising / Media";
  return EXPENDITURE_CATEGORY_LABELS[purposeCode.trim().toUpperCase()] ?? "Operations / Other";
}

function buildExpenditureProfile(
  expenditureRows: Array<Record<string, string>>,
): ExpenditureProfile | null {
  if (expenditureRows.length === 0) return null;

  const categoryTotals = new Map<string, number>();
  // Track per-payee totals AND a per-payee-per-category breakdown to assign dominant category
  const payeeTotals = new Map<string, { total: number; byCategory: Map<string, number> }>();

  for (const row of expenditureRows) {
    const amount = Number.parseFloat((row.AMNT ?? "").replace(/,/g, "").trim());
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const payeeName = (row.NAME ?? "").trim() || "Unknown";
    const category = classifyExpenditure(row.PURPOSECD ?? "", payeeName);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount);

    const existing = payeeTotals.get(payeeName) ?? { total: 0, byCategory: new Map<string, number>() };
    existing.total += amount;
    existing.byCategory.set(category, (existing.byCategory.get(category) ?? 0) + amount);
    payeeTotals.set(payeeName, existing);
  }

  const totalSpent = Array.from(categoryTotals.values()).reduce((s, v) => s + v, 0);
  if (totalSpent === 0) return null;

  const byCategory = Array.from(categoryTotals.entries())
    .map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);

  const topPayees = Array.from(payeeTotals.entries())
    .map(([name, { total, byCategory: catMap }]) => {
      // Use the category where the most money was spent for this payee
      let dominantCategory = "Operations / Other";
      let maxCatAmount = 0;
      for (const [cat, amt] of catMap.entries()) {
        if (amt > maxCatAmount) { maxCatAmount = amt; dominantCategory = cat; }
      }
      return { name, amount: Math.round(total * 100) / 100, category: dominantCategory };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return { totalSpent: Math.round(totalSpent * 100) / 100, byCategory, topPayees };
}

function isNycContributor(row: Record<string, string>): boolean {
  const borough = row.BOROUGHCD?.trim().toUpperCase() ?? "";
  if (["M", "B", "K", "Q", "X", "R"].includes(borough)) {
    return true;
  }

  const state = row.STATE?.trim().toUpperCase() ?? "";
  const normalizedCity = (row.CITY ?? "").trim().toUpperCase();
  if (state !== "NY") {
    return false;
  }

  return [
    "NEW YORK",
    "NEW YORK CITY",
    "MANHATTAN",
    "BROOKLYN",
    "QUEENS",
    "BRONX",
    "STATEN ISLAND",
  ].includes(normalizedCity);
}

function buildGrassrootsScore(
  smallDollarShare: number | null,
  topTenDonorShare: number | null,
  organizationalDonorShare: number | null,
  outsideCityShare: number | null,
): { score: number; grade: string } {
  let raw = 0;
  let totalWeight = 0;

  if (smallDollarShare !== null) {
    raw += Math.min(smallDollarShare, 1) * 40;
    totalWeight += 40;
  }
  if (topTenDonorShare !== null) {
    raw += (1 - Math.min(topTenDonorShare, 1)) * 30;
    totalWeight += 30;
  }
  if (organizationalDonorShare !== null) {
    raw += (1 - Math.min(organizationalDonorShare, 1)) * 15;
    totalWeight += 15;
  }
  if (outsideCityShare !== null) {
    raw += (1 - Math.min(outsideCityShare, 1)) * 15;
    totalWeight += 15;
  }

  const score = totalWeight > 0 ? Math.round((raw / totalWeight) * 100) : 0;

  let grade: string;
  if (score >= 90) grade = "A+";
  else if (score >= 85) grade = "A";
  else if (score >= 80) grade = "A-";
  else if (score >= 75) grade = "B+";
  else if (score >= 70) grade = "B";
  else if (score >= 65) grade = "B-";
  else if (score >= 60) grade = "C+";
  else if (score >= 55) grade = "C";
  else if (score >= 50) grade = "C-";
  else if (score >= 45) grade = "D+";
  else if (score >= 40) grade = "D";
  else grade = "F";

  return { score, grade };
}

function buildExplanatoryNotes(profile: FinanceInsightInput): string[] {
  const notes: string[] = [];

  if ((profile.publicFunds ?? 0) > 0 && profile.publicFundsShare !== null) {
    if (profile.publicFundsShare >= 0.65) {
      notes.push(`Public matching funds make up ${pctText(profile.publicFundsShare)} of this campaign's total resources.`);
    } else if (profile.publicFundsShare >= 0.35) {
      notes.push(`Public matching funds account for about ${pctText(profile.publicFundsShare)} of the campaign's total resources.`);
    } else {
      notes.push("This campaign received public matching funds through New York City's matching funds program, but private fundraising still made up the larger share of resources.");
    }
  }

  if ((profile.smallDollarShare ?? 0) >= 0.5 && (profile.smallDollarDonorCount ?? 0) > 0) {
    notes.push(
      `Small-dollar donors contributed ${pctText(profile.smallDollarShare)} of reported private fundraising across ${profile.smallDollarDonorCount} contributions.`,
    );
  }

  if (profile.topTenDonorShare !== null) {
    if (profile.topTenDonorShare >= 0.3) {
      notes.push(`Private fundraising is relatively concentrated: the top ten donors account for ${pctText(profile.topTenDonorShare)} of reported private contributions.`);
    } else if (profile.topTenDonorShare <= 0.15) {
      notes.push(`Private fundraising looks relatively diffuse: the top ten donors account for only ${pctText(profile.topTenDonorShare)} of reported private contributions.`);
    }
  }

  if ((profile.maxContributionDonorCount ?? 0) > 0 && (profile.maxContributionAmount ?? 0) > 0) {
    notes.push(
      `${profile.maxContributionDonorCount} donors gave at the legal maximum, totaling $${Math.round(profile.maxContributionAmount ?? 0).toLocaleString()}.`,
    );
  }

  if ((profile.organizationalDonorShare ?? 0) >= 0.15) {
    notes.push(
      `Committees, unions, or other non-individual donors made up ${pctText(profile.organizationalDonorShare)} of reported private fundraising.`,
    );
  }

  if ((profile.outsideCityShare ?? 0) >= 0.15) {
    notes.push(`A noticeable share of reported private fundraising, ${pctText(profile.outsideCityShare)}, came from outside New York City.`);
  }

  const leadIndustry = profile.topIndustries.find((industry) => industry.label !== "Other / Mixed");
  if (leadIndustry) {
    notes.push(`Among reported private contributions, ${leadIndustry.label.toLowerCase()} stands out as one of the strongest donor patterns.`);
  }

  if (notes.length === 0) {
    notes.push(`This campaign reported ${profile.contributorCount} contributors in the most recent public filing cycle.`);
  }

  return notes.slice(0, 5);
}

function normalizeCandidateName(value: string): string {
  const cleaned = value.replace(/\(ID:[^)]+\)/g, "").replace(/\*/g, "").trim();
  const [lastName = "", firstName = ""] = cleaned.split(",");
  return normalizePersonName(`${firstName} ${lastName}`);
}

function findCandidateForMember(
  slug: string,
  displayName: string,
  candidates: Array<Record<string, string>>,
  overrides: FinanceOverrideMap,
): Record<string, string> | null {
  const override = overrides[slug];
  if (override?.candidateId) {
    return candidates.find((candidate) => candidate.cand_id === override.candidateId) ?? null;
  }

  if (override?.candidateName) {
    const normalizedOverride = normalizePersonName(override.candidateName);
    return candidates.find((candidate) => normalizeCandidateName(candidate.cand_name) === normalizedOverride) ?? null;
  }

  const normalizedMember = normalizePersonName(displayName);
  const memberTokens = normalizedMember.split(" ");
  const memberFirst = memberTokens[0] ?? "";
  const memberLast = memberTokens.at(-1) ?? "";

  return (
    candidates.find((candidate) => {
      const normalizedCandidate = normalizeCandidateName(candidate.cand_name);
      if (normalizedCandidate === normalizedMember) {
        return true;
      }

      const candidateTokens = normalizedCandidate.split(" ");
      const candidateFirst = candidateTokens[0] ?? "";
      const candidateLast = candidateTokens.at(-1) ?? "";

      return candidateFirst === memberFirst && candidateLast === memberLast;
    }) ?? null
  );
}

export async function buildFinance(): Promise<Map<string, MemberFinanceProfile>> {
  const [analysisCsv, contributionsCsv, paymentsCsv, expendituresCsv] = await Promise.all([
    fetch(CFB_FINANCIAL_ANALYSIS_URL).then((response) => response.text()),
    fetch(CFB_CONTRIBUTIONS_URL).then((response) => response.text()),
    fetch(CFB_PAYMENTS_URL).then((response) => response.text()),
    fetch(CFB_EXPENDITURES_URL).then((response) => response.text()),
  ]);

  const analysisRows = parseCsv(analysisCsv).filter((row) => row.office === "5");
  const contributionRows = parseCsv(contributionsCsv).filter((row) => row.OFFICECD.trim() === "5");
  const paymentRows = parseCsv(paymentsCsv).filter((row) => row.OFFICECD.trim() === "5");
  const expenditureRows = parseCsv(expendituresCsv).filter((row) => row.OFFICECD.trim() === "5");
  const supplemental = await readJsonFile<SupplementalRow[]>(path.join(CONTENT_DIR, "member-supplemental.json"));
  const overrides = await readJsonFile<FinanceOverrideMap>(path.join(CONTENT_DIR, "campaign-finance-overrides.json")).catch(() => ({}));

  const latestAnalysisByCandidate = new Map<string, Record<string, string>>();
  for (const row of analysisRows) {
    const existing = latestAnalysisByCandidate.get(row.cand_id);
    if (!existing || Number.parseInt(row.to_stmt, 10) >= Number.parseInt(existing.to_stmt, 10)) {
      latestAnalysisByCandidate.set(row.cand_id, row);
    }
  }

  const candidateRows = Array.from(latestAnalysisByCandidate.values());
  const paymentByCandidateId = new Map<string, Record<string, string>>();
  for (const row of paymentRows) {
    paymentByCandidateId.set(row.CANDID.trim(), row);
  }

  const financeProfiles = new Map<string, MemberFinanceProfile>();
  await ensureDir(path.join(PROCESSED_DIR, "finance"));
  await ensureDir(path.join(PUBLIC_DATA_DIR, "finance"));

  for (const member of supplemental) {
    if (!member.slug) {
      continue;
    }

    const candidate = findCandidateForMember(member.slug, member.displayName, candidateRows, overrides);
    if (!candidate) {
      continue;
    }

    const candidateId = candidate.cand_id?.trim() ?? null;
    const candidateContributions = contributionRows
      .filter((row) => row.RECIPID.trim() === candidateId)
      .filter((row) => parseAmount(row.AMNT) > 0);
    const payment = candidateId ? paymentByCandidateId.get(candidateId) : null;

    const donorGroups = new Map<string, FinanceTopDonor>();
    for (const row of candidateContributions) {
      const donorName = row.NAME || "Unknown donor";
      const amount = parseAmount(row.AMNT);
      const existing = donorGroups.get(donorName) ?? {
        name: donorName,
        amount: 0,
        donorType: row.C_CODE || "Unknown",
        city: row.CITY || "",
        state: row.STATE || "",
        occupation: row.OCCUPATION || "",
        employer: row.EMPNAME || "",
      };
      existing.amount += amount;
      donorGroups.set(donorName, existing);
    }

    const topDonors = Array.from(donorGroups.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const contributorCount = donorGroups.size;
    const topTenDonorAmount = topDonors.reduce((sum, donor) => sum + donor.amount, 0);
    const organizationalDonorAmount = candidateContributions
      .filter((row) => (row.C_CODE || "").trim().toUpperCase() !== "IND")
      .reduce((sum, row) => sum + parseAmount(row.AMNT), 0);
    const outsideCityAmount = candidateContributions
      .filter((row) => !isNycContributor(row))
      .reduce((sum, row) => sum + parseAmount(row.AMNT), 0);

    const industryGroups = new Map<string, { amount: number; donors: string[] }>();
    for (const row of candidateContributions) {
      const label = classifyIndustry(row.OCCUPATION || "", row.EMPNAME || "");
      const current = industryGroups.get(label) ?? { amount: 0, donors: [] };
      current.amount += parseAmount(row.AMNT);
      current.donors.push(row.NAME || "");
      industryGroups.set(label, current);
    }

    const topIndustries: FinanceIndustryBreakdown[] = Array.from(industryGroups.entries())
      .map(([label, value]) => ({
        label,
        amount: value.amount,
        contributorCount: uniqueCount(value.donors),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const donorsByIndustry: Record<string, FinanceTopDonor[]> = {};
    for (const donorRecord of donorGroups.values()) {
      const label = classifyIndustry(donorRecord.occupation, donorRecord.employer);
      if (!donorsByIndustry[label]) donorsByIndustry[label] = [];
      donorsByIndustry[label].push(donorRecord);
    }
    for (const label of Object.keys(donorsByIndustry)) {
      donorsByIndustry[label] = donorsByIndustry[label]
        .sort((a, b) => b.amount - a.amount);
    }

    const totalRaised = parseAmount(candidate.net_cntns);
    const publicFunds = payment ? parseAmount(payment.TOTALPAY) : parseAmount(candidate.pubfnd_pmt);
    const smallDollarAmount = parseAmount(candidate.sml_amt);
    const smallDollarDonorCount = parseCount(candidate.sml_no);
    const maxContributionDonorCount = parseCount(candidate.max_no);
    const maxContributionAmount = parseAmount(candidate.max_amt);
    const publicFundsShare = totalRaised + publicFunds > 0 ? Number((publicFunds / (totalRaised + publicFunds)).toFixed(3)) : null;
    const smallDollarShare = totalRaised > 0 ? Number((smallDollarAmount / totalRaised).toFixed(3)) : null;
    const topTenDonorShare = totalRaised > 0 ? Number((topTenDonorAmount / totalRaised).toFixed(3)) : null;
    const organizationalDonorShare = totalRaised > 0 ? Number((organizationalDonorAmount / totalRaised).toFixed(3)) : null;
    const outsideCityShare = totalRaised > 0 ? Number((outsideCityAmount / totalRaised).toFixed(3)) : null;

    const { score: grassrootsScore, grade: grassrootsGrade } = buildGrassrootsScore(
      smallDollarShare,
      topTenDonorShare,
      organizationalDonorShare,
      outsideCityShare,
    );

    const candidateExpenditures = candidateId
      ? expenditureRows.filter((row) => row.CANDID.trim() === candidateId)
      : [];
    const expenditures = buildExpenditureProfile(candidateExpenditures);

    const profile: MemberFinanceProfile = {
      slug: member.slug,
      cycle: "2025",
      candidateName: candidate.cand_name.replace(/\(ID:[^)]+\)/g, "").replace(/\*/g, "").trim(),
      candidateId,
      sourceUrl: `${CFB_BASE_URL}/follow-the-money/`,
      updatedAt: new Date().toISOString(),
      contributorCount,
      totalRaised: totalRaised || null,
      publicFunds: publicFunds || null,
      publicFundsShare,
      smallDollarAmount: smallDollarAmount || null,
      smallDollarDonorCount,
      smallDollarShare,
      topTenDonorShare,
      maxContributionDonorCount,
      maxContributionAmount: maxContributionAmount || null,
      organizationalDonorAmount: organizationalDonorAmount || null,
      organizationalDonorShare,
      outsideCityAmount: outsideCityAmount || null,
      outsideCityShare,
      topDonors,
      topIndustries,
      donorsByIndustry,
      grassrootsScore,
      grassrootsGrade,
      expenditures,
      explanatoryNotes: buildExplanatoryNotes({
        contributorCount,
        publicFunds: publicFunds || null,
        totalRaised: totalRaised || null,
        publicFundsShare,
        smallDollarAmount: smallDollarAmount || null,
        smallDollarDonorCount,
        smallDollarShare,
        topTenDonorShare,
        maxContributionDonorCount,
        maxContributionAmount: maxContributionAmount || null,
        organizationalDonorShare,
        outsideCityShare,
        topIndustries,
      }),
    };

    financeProfiles.set(member.slug, profile);
    await writeJsonFile(path.join(PROCESSED_DIR, "finance", `${member.slug}.json`), profile);
    await writeJsonFile(path.join(PUBLIC_DATA_DIR, "finance", `${member.slug}.json`), profile);
  }

  console.log(`[build-finance] wrote finance profiles for ${financeProfiles.size} members`);
  return financeProfiles;
}

export interface FinanceIndexRow {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  borough: string;
  totalRaised: number | null;
  publicFundsShare: number | null;
  smallDollarShare: number | null;
  topTenDonorShare: number | null;
  contributorCount: number;
  avgContribution: number | null;
  outsideCityShare: number | null;
  organizationalDonorShare: number | null;
  hasRealEstateFlag: boolean;
  topIndustries: FinanceIndustryBreakdown[];
}

interface MemberIndexRow {
  slug: string | null;
  fullName: string;
  districtNumber: number;
  party: string;
  status: string;
}

function districtToBorough(district: number): string {
  if (district >= 1 && district <= 7) return "Manhattan";
  if (district === 8) return "Bronx";
  if (district >= 9 && district <= 10) return "Manhattan";
  if (district >= 11 && district <= 18) return "Bronx";
  if (district >= 19 && district <= 32) return "Queens";
  if (district >= 33 && district <= 48) return "Brooklyn";
  if (district >= 49 && district <= 51) return "Staten Island";
  return "NYC";
}

export async function buildFinanceIndex(): Promise<void> {
  const membersIndexPath = path.join(PUBLIC_DATA_DIR, "members-index.json");
  const membersIndex = await readJsonFile<MemberIndexRow[]>(membersIndexPath);
  const financeDir = path.join(PUBLIC_DATA_DIR, "finance");

  const rows: FinanceIndexRow[] = [];

  for (const member of membersIndex) {
    if (!member.slug || member.status !== "seated") continue;

    const financePath = path.join(financeDir, `${member.slug}.json`);
    let finance: MemberFinanceProfile | null = null;
    try {
      finance = await readJsonFile<MemberFinanceProfile>(financePath);
    } catch {
      continue;
    }

    if (!finance || finance.totalRaised === null) continue;

    const avgContribution =
      finance.totalRaised !== null && finance.contributorCount > 0
        ? Number((finance.totalRaised / finance.contributorCount).toFixed(2))
        : null;

    const hasRealEstateFlag = finance.topIndustries.some(
      (ind) =>
        ind.label.toLowerCase().includes("real estate") &&
        ind.amount > (finance.totalRaised ?? 0) * 0.1,
    );

    rows.push({
      slug: member.slug,
      fullName: member.fullName,
      districtNumber: member.districtNumber,
      party: member.party,
      borough: districtToBorough(member.districtNumber),
      totalRaised: finance.totalRaised,
      publicFundsShare: finance.publicFundsShare,
      smallDollarShare: finance.smallDollarShare,
      topTenDonorShare: finance.topTenDonorShare,
      contributorCount: finance.contributorCount,
      avgContribution,
      outsideCityShare: finance.outsideCityShare,
      organizationalDonorShare: finance.organizationalDonorShare,
      hasRealEstateFlag,
      topIndustries: finance.topIndustries,
    });
  }

  rows.sort((a, b) => a.districtNumber - b.districtNumber);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "finance-index.json"), rows);
  console.log(`[build-finance] wrote finance-index.json with ${rows.length} rows`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildFinance()
    .then(() => buildFinanceIndex())
    .catch((error) => {
      console.error("[build-finance] failed", error);
      process.exitCode = 1;
    });
}
