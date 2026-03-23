import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { ensureDir, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import type { HearingRecord, SearchDocument } from "../src/lib/types";

interface BillIndexRow {
  billId: string;
  session: number;
  number: string;
  introNumber: string;
  title: string;
  summary: string;
  committee: string;
  route: string;
}

interface MemberIndexRow {
  slug: string | null;
  fullName: string;
  districtNumber: number;
  party: string;
  status: "seated" | "vacant";
}

function buildFilterRoute(pathname: string, query: string): string {
  return `${pathname}?q=${encodeURIComponent(query)}`;
}

function formatSearchDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function buildSearchIndex(): Promise<SearchDocument[]> {
  const bills = await readJsonFile<BillIndexRow[]>(path.join(PROCESSED_DIR, "bills-index.json"));
  const members = await readJsonFile<MemberIndexRow[]>(path.join(PROCESSED_DIR, "members-index.json"));
  const hearings = await readJsonFile<HearingRecord[]>(path.join(PROCESSED_DIR, "hearings-upcoming.json")).catch(() => []);

  const memberDocs: SearchDocument[] = members
    .filter((member) => member.slug && member.status === "seated")
    .map((member) => ({
      id: `member:${member.slug}`,
      type: "member",
      label: member.fullName,
      subtitle: `District ${member.districtNumber} · ${member.party}`,
      route: `/members/${member.slug}`,
      memberName: member.fullName,
      searchText: `${member.fullName} district ${member.districtNumber} ${member.party}`,
    }));

  const billDocs: SearchDocument[] = bills.map((bill) => ({
    id: `bill:${bill.billId}`,
    type: "bill",
    label: bill.introNumber,
    subtitle: bill.title,
    route: buildFilterRoute("/bills", bill.introNumber),
    introNumber: bill.introNumber,
    billTitle: bill.title,
    committeeName: bill.committee,
    searchText: `${bill.introNumber} ${bill.title} ${bill.summary} ${bill.committee}`,
  }));

  const hearingDocs: SearchDocument[] = hearings.map((hearing): SearchDocument => {
    const hearingDate = hearing.date.slice(0, 10);
    const billTitles = hearing.agendaItems.map((item) => item.title).join(" ");
    return {
      id: `hearing:${hearing.eventId}`,
      type: "hearing",
      label: hearing.bodyName,
      subtitle: `${formatSearchDate(hearing.date)} · ${hearing.location}`,
      route: buildFilterRoute("/hearings", `${hearing.bodyName} ${hearingDate}`),
      hearingTitle: hearing.bodyName,
      hearingDate,
      committeeName: hearing.bodyName,
      searchText: `${hearing.bodyName} ${hearing.location} ${hearingDate} ${billTitles}`,
    };
  });

  const documents = [...memberDocs, ...billDocs, ...hearingDocs];

  await writeJsonFile(path.join(PROCESSED_DIR, "search-index.json"), documents);
  await ensureDir(PUBLIC_DATA_DIR);
  await writeJsonFile(path.join(PUBLIC_DATA_DIR, "search-index.json"), documents);

  console.log(`[build-search-index] wrote ${documents.length} search documents`);
  return documents;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildSearchIndex().catch((error) => {
    console.error("[build-search-index] failed", error);
    process.exitCode = 1;
  });
}
