import path from "node:path";
import { PROCESSED_DIR, PUBLIC_DATA_DIR } from "./lib/constants";
import { ensureDir, readJsonFile, writeJsonFile } from "./lib/fs-utils";
import type { SearchDocument } from "../src/lib/types";

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

interface MemberProfile {
  slug: string;
  committees: Array<{ bodyName: string }>;
}

async function loadCommitteeDocuments(memberRows: MemberIndexRow[]): Promise<SearchDocument[]> {
  const committeeMap = new Map<string, SearchDocument>();

  for (const member of memberRows) {
    if (!member.slug || member.status !== "seated") {
      continue;
    }

    const profile = await readJsonFile<MemberProfile>(path.join(PROCESSED_DIR, "members", `${member.slug}.json`));
    for (const committee of profile.committees) {
      const key = committee.bodyName.toLowerCase();
      if (!committeeMap.has(key)) {
        committeeMap.set(key, {
          id: `committee:${key}`,
          type: "committee",
          label: committee.bodyName,
          subtitle: "Committee",
          route: "/council",
          committeeName: committee.bodyName,
        });
      }
    }
  }

  return Array.from(committeeMap.values());
}

export async function buildSearchIndex(): Promise<SearchDocument[]> {
  const bills = await readJsonFile<BillIndexRow[]>(path.join(PROCESSED_DIR, "bills-index.json"));
  const members = await readJsonFile<MemberIndexRow[]>(path.join(PROCESSED_DIR, "members-index.json"));

  const memberDocs: SearchDocument[] = members
    .filter((member) => member.slug && member.status === "seated")
    .map((member) => ({
      id: `member:${member.slug}`,
      type: "member",
      label: member.fullName,
      subtitle: `District ${member.districtNumber} · ${member.party}`,
      route: `/member/${member.slug}`,
      memberName: member.fullName,
    }));

  const billDocs: SearchDocument[] = bills.map((bill) => ({
    id: `bill:${bill.billId}`,
    type: "bill",
    label: bill.introNumber,
    subtitle: bill.title,
    route: bill.route,
    introNumber: bill.introNumber,
    billTitle: bill.title,
    committeeName: bill.committee,
  }));

  const committeeDocs = await loadCommitteeDocuments(members);
  const documents = [...memberDocs, ...billDocs, ...committeeDocs];

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
